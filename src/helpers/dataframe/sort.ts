import { computeRanks, deserializeOrderBy, OrderBy, serializeOrderBy, validateOrderByAgainstSortableColumns } from '../sort.js'
import { createEventTarget } from '../typedEventTarget.js'
import { checkSignal, validateColumn, validateFetchParams, validateRow } from './helpers.js'
import { DataFrame, DataFrameEvents, Obj, ResolvedValue } from './types.js'

/**
 * Wrap a DataFrame to make it sortable on the specified columns.
 * This helper might not be efficient for large datasets, use with caution.
 *
 * @param data The DataFrame to wrap.
 * @param options Optional parameters.
 * @param options.sortableColumns A set of column names that should be sortable. If not provided, all columns are considered sortable.
 * @param options.exclusiveSort If true, only one column can be sorted at a time, and any update to orderBy will replace the previous one. Defaults to false.
 *
 * @returns A new DataFrame that supports sorting on the specified columns.
 */
export function sortableDataFrame<M extends Obj, C extends Obj>(
  data: DataFrame<M, C>, options?: { sortableColumns?: Set<string>, exclusiveSort?: boolean }
): DataFrame<M, C> {
  // If sortableColumns is not provided, make all columns sortable.
  const sortableColumns = options?.sortableColumns ?? new Set(data.columnDescriptors.map(c => c.name))
  const exclusiveSort = options?.exclusiveSort ?? data.exclusiveSort
  // Validate that all sortable columns are present in the header.
  for (const column of sortableColumns) {
    validateColumn({ column, data: { columnDescriptors: data.columnDescriptors } })
  }
  // If the dataframe already respects the sortableColumns, we can return it as is.
  if (data.columnDescriptors.every(({ name, sortable }) => {
    if (sortableColumns.has(name)) {
      return sortable === true // If the column is in sortableColumns, it should be sortable
    }
    return sortable === false || sortable === undefined // If the column is not in sortableColumns, it should not be sortable
  })) {
    // TODO(SL): we should return a clone of the data frame (and we should provide a helper function to clone a dataframe).
    if (options && 'exclusiveSort' in options && data.exclusiveSort !== options.exclusiveSort) {
      return { ...data, exclusiveSort: options.exclusiveSort }
    }
    return data
  }

  const columnDescriptors = data.columnDescriptors.map(({ name, metadata }) => ({
    name,
    sortable: sortableColumns.has(name),
    metadata: structuredClone(metadata), // Create a deep copy of the column metadata to avoid mutating the original
  }))
  const metadata = structuredClone(data.metadata) // Create a deep copy of the metadata to avoid mutating the original
  const eventTarget = createEventTarget<DataFrameEvents>()

  // The cache cannot be erased publicly. But it will be refreshed on each data change
  const ranksByColumn = new Map<string, number[]>()
  const indexesByOrderBy = new Map<string, number[]>()
  function computeCache({ orderBy, signal, refresh }: { orderBy: OrderBy, signal?: AbortSignal, refresh?: boolean }) {
    return fetchIndexes({
      orderBy,
      signal,
      ranksByColumn,
      indexes: refresh ? undefined : indexesByOrderBy.get(serializeOrderBy(orderBy)),
      setIndexes: ({ orderBy, indexes }) => {
        // Store the indexes in the map.
        indexesByOrderBy.set(serializeOrderBy(orderBy), indexes)
        if (!refresh) {
          // Notify the event target that the indexes have been updated.
          eventTarget.dispatchEvent(new CustomEvent('resolve'))
        }
      },
      data,
    })
  }
  function refreshCaches() {
    return Promise.all([...indexesByOrderBy.keys()].map(serializedOrderBy =>
      computeCache({ orderBy: deserializeOrderBy(serializedOrderBy), refresh: true })
    ))
  }
  data.eventTarget?.addEventListener('update', async () => {
    // the update notification might be delayed if refreshing the caches takes time
    // it might not be optimal to refresh all caches on every update, but it's the simplest way to ensure consistency
    // also: during the refresh, the data might be in an inconsistent state
    await refreshCaches()
    eventTarget.dispatchEvent(new CustomEvent('update'))
  })
  data.eventTarget?.addEventListener('numrowschange', async () => {
    // the numrowschange notification might be delayed if refreshing the caches takes time
    // it might not be optimal to refresh all caches on every update, but it's the simplest way to ensure consistency
    // also: during the refresh, the data might be in an inconsistent state
    await refreshCaches()
    eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
  })

  const getUpstreamRow: ({ row, orderBy }: { row: number, orderBy?: OrderBy }) => ResolvedValue<number> | undefined = function ({ row, orderBy }) {
    // numRows: Infinity because the upstream data size can change dynamically.
    validateRow({ row, data: { numRows: Infinity } })
    validateOrderByAgainstSortableColumns({ orderBy, sortableColumns, exclusiveSort })
    if (!orderBy || orderBy.length === 0) {
      // If no orderBy is provided, we can return the upstream row number.
      return { value: row }
    }
    const serializedOrderBy = serializeOrderBy(orderBy)
    const indexes = indexesByOrderBy.get(serializedOrderBy)
    const rowNumber = indexes?.[row]
    if (rowNumber === undefined) {
      return undefined
    }
    return { value: rowNumber }
  }

  const getRowNumber: ({ row, orderBy }: { row: number, orderBy?: OrderBy }) => ResolvedValue<number> | undefined = function ({ row, orderBy }) {
    // numRows: Infinity because the upstream data size can change dynamically.
    validateRow({ row, data: { numRows: Infinity } })
    const upstreamRow = getUpstreamRow({ row, orderBy })
    if (!upstreamRow) {
      // If we can't resolve the unsorted row, we return undefined.
      return undefined
    }
    return data.getRowNumber({ row: upstreamRow.value })
  }

  const getCell: ({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) => ResolvedValue | undefined = function({ row, column, orderBy }){
    validateColumn({ column, data: { columnDescriptors } })
    // numRows: Infinity because the upstream data size can change dynamically.
    validateRow({ row, data: { numRows: Infinity } })
    const upstreamRow = getUpstreamRow({ row, orderBy })
    if (!upstreamRow) {
      // If we can't resolve the unsorted row, we return undefined.
      return undefined
    }
    return data.getCell({ row: upstreamRow.value, column })
  }

  const fetch: ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void> = async function ({ rowStart, rowEnd, columns, orderBy, signal }) {
    // numRows: Infinity because the upstream data size can change dynamically.
    validateFetchParams({ rowStart, rowEnd, columns, orderBy, data: { numRows: Infinity, columnDescriptors } })
    function callback() {
      eventTarget.dispatchEvent(new CustomEvent('resolve'))
    }
    data.eventTarget?.addEventListener('resolve', callback)

    try {
      if (!orderBy || orderBy.length === 0) {
        // If orderBy is not provided, we can fetch the data without sorting.
        await data.fetch?.({ rowStart, rowEnd, columns, signal })
        return
      }
      if (rowStart === rowEnd) {
        // If the range is empty, we can return.
        return
      }

      // Ensure row numbers are available
      const indexes = await computeCache({ orderBy, signal })

      // Ensure cells are available
      if (columns && columns.length > 0 && data.fetch) {
        await fetchFromIndexes({ columns, signal, indexes: indexes.slice(rowStart, rowEnd), fetch: data.fetch })
      }
    } finally {
      data.eventTarget?.removeEventListener('resolve', callback)
    }
  }

  return {
    metadata,
    columnDescriptors,
    getRowNumber,
    getCell,
    fetch,
    eventTarget,
    exclusiveSort,
    get numRows() {
      return data.numRows
    },
  }
}

async function fetchFromIndexes({ columns, indexes, signal, fetch }: { columns?: string[], indexes: number[], signal?: AbortSignal, fetch: Exclude<DataFrame['fetch'], undefined> }): Promise<void> {
  // Fetch the data for every index, grouping the fetches by consecutive rows.
  const rowNumberIndexes = indexes.sort()
  const promises: Promise<void>[] = []
  let range: [number, number] | undefined = undefined
  for (const row of rowNumberIndexes) {
    if (range === undefined) {
      // First iteration
      range = [row, row + 1]
    } else if (range[1] === row) {
      // Consecutive row, extend the range.
      range[1] = row + 1
    } else {
      // The row is not consecutive, fetch the previous range and start a new one.
      promises.push(fetch({ rowStart: range[0], rowEnd: range[1], columns, signal }))
      range = [row, row + 1]
    }
  }
  if (range) {
    // Fetch the last range.
    promises.push(fetch({ rowStart: range[0], rowEnd: range[1], columns, signal }))
  }
  await Promise.all(promises)
}

type OrderByWithRanks = {
  direction: 'ascending' | 'descending',
  ranks: number[]
}[]

export async function fetchIndexes<M extends Obj, C extends Obj>(
  { orderBy, signal, ranksByColumn, setRanks, indexes, setIndexes, data }: { orderBy: OrderBy, signal?: AbortSignal, ranksByColumn?: Map<string, number[]>, setRanks?: ({ column, ranks }: { column: string, ranks: number[] }) => void, indexes?: number[], setIndexes?: ({ orderBy, indexes }: { orderBy: OrderBy, indexes: number[] }) => void, data: DataFrame<M, C> }
): Promise<number[]> {
  if (!indexes) {
    // If the indexes are not cached, we need to compute them.
    // First, we fetch the ranks for each column in the orderBy.
    // If the ranks are already cached, we use them, otherwise we compute them.
    const orderByWithRanks = await fetchOrderByWithRanks({ orderBy, signal, ranksByColumn, setRanks, data })
    // Compute the indexes using the ranks for each column in the orderBy.
    indexes = computeIndexes(orderByWithRanks)
    setIndexes?.({ orderBy, indexes })
  }
  return indexes
}

/**
 * Compute the orderBy with ranks for each column.
 *
 * @param {Object} params
 * @param {OrderBy} params.orderBy The orderBy to compute ranks for.
 * @param {DataFrame} params.data The data frame to compute ranks from.
 * @param {Map<string, number[]>} [params.ranksByColumn] A map of column names to promises that resolve to their ranks.
 * @param {Function} [params.setRanks] A function to set the ranks for each column. It should accept an object with the column name and the ranks.
 * @param {AbortSignal} [params.signal] A signal to cancel the computation. If the signal is aborted, the function rejects with an AbortError DOMException.
 *
 * @returns {Promise<{ direction: 'ascending' | 'descending', ranks: number[] }[]>} A promise that resolves to an array of objects containing the direction and ranks for each column in the orderBy.
 */
async function fetchOrderByWithRanks<M extends Obj, C extends Obj>(
  { orderBy, signal, ranksByColumn, setRanks, data }: { orderBy: OrderBy, signal?: AbortSignal, ranksByColumn?: Map<string, number[]>, setRanks?: ({ column, ranks }: { column: string, ranks: number[] }) => void, data: DataFrame<M, C> }
): Promise<OrderByWithRanks> {
  const orderByWithRanks: OrderByWithRanks = []
  const promises: Promise<any>[] = []

  for (const [i, { column, direction }] of orderBy.entries()) {
    validateColumn({ column, data: { columnDescriptors: data.columnDescriptors } })
    const columnRanks = ranksByColumn?.get(column)
    if (columnRanks) {
      orderByWithRanks[i] = { direction, ranks: columnRanks }
    } else {
      promises.push(
        (
          data.fetch ?
            data.fetch({ rowStart: 0, rowEnd: data.numRows, columns: [column], signal }) :
            Promise.resolve() // if fetch is not defined, resolve immediately
        ).then(() => {
          checkSignal(signal)
          // Get the values
          const columnValues = Array.from({ length: data.numRows }, (_, row) => {
            const cell = data.getCell({ row, column })
            if (!cell) {
              throw new Error(`Cell not found for row ${row} and column ${column}`)
            }
            return cell.value
          })
          // return the ranks in ascending order
          // we can get the descending order replacing the rank with numRows - rank - 1. It's not exactly the rank of
          // the descending order, because the rank is the first, not the last, of the ties. But it's enough for the
          // purpose of sorting.
          const ranks = computeRanks(columnValues)
          setRanks?.({ column, ranks })
          orderByWithRanks[i] = { direction, ranks }
        })
      )
    }
  }

  await Promise.all(promises)
  return orderByWithRanks
}

function computeIndexes(orderByWithRanks: OrderByWithRanks): number[] {
  if (!(0 in orderByWithRanks)) {
    throw new Error('orderByWithRanks should have at least one element')
  }
  const numRows = orderByWithRanks[0].ranks.length
  const indexes = Array.from({ length: numRows }, (_, i) => i)
  const dataIndexes = indexes.sort((a, b) => {
    for (const { direction, ranks } of orderByWithRanks) {
      const rankA = ranks[a]
      const rankB = ranks[b]
      if (rankA === undefined || rankB === undefined) {
        throw new Error('Invalid ranks')
      }
      const value = direction === 'ascending' ? 1 : -1
      if (rankA < rankB) return -value
      if (rankA > rankB) return value
    }
    // If all ranks are equal, we keep the original order
    return a - b
  })
  // dataIndexes[0] gives the index of the first row in the sorted table
  return dataIndexes
}
