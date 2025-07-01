import { OrderBy, computeRanks, serializeOrderBy, validateOrderBy } from '../sort.js'
import { createEventTarget } from '../typedEventTarget.js'
import { validateRow } from './helpers.js'
import { DataFrame, DataFrameEvents, ResolvedValue, SortableDataFrame } from './types.js'

export function sortableDataFrame(data: DataFrame): SortableDataFrame {
  if (data.sortable) {
    // If the data frame is already sortable, we can return it as is.
    return data
  }

  const { header, numRows, getCell } = data

  const wrappedHeader = header.slice() // Create a shallow copy of the header to avoid mutating the original

  // The cache cannot be erased. Create a new data frame if needed.
  const ranksByColumn = new Map<string, number[]>()
  const indexesByOrderBy = new Map<string, number[]>()

  const eventTarget = createEventTarget<DataFrameEvents>()

  function wrappedGetRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> | undefined {
    validateRow({ row, data: { numRows } })
    if (!orderBy || orderBy.length === 0) {
      // If no orderBy is provided, we can return the row as is.
      return { value: row }
    }
    validateOrderBy({ header, orderBy })
    const serializedOrderBy = serializeOrderBy(orderBy)
    const indexes = indexesByOrderBy.get(serializedOrderBy)
    const rowNumber = indexes?.[row]
    if (rowNumber === undefined) {
      return undefined
    }
    return { value: rowNumber }
  }

  function wrappedGetCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    const rowNumber = wrappedGetRowNumber({ row, orderBy })
    if (!rowNumber) {
      // If we can't resolve the unsorted row, we return undefined.
      return undefined
    }
    return getCell({ row: rowNumber.value, column })
  }

  async function wrappedFetch(args: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }): Promise<void> {
    const { orderBy, ...rest } = args
    if (!orderBy || orderBy.length === 0) {
      // If orderBy is not provided, we can fetch the data without sorting.
      return data.fetch(rest)
    }

    const { rowStart, rowEnd, columns, signal } = rest

    if (rowStart < 0 || rowEnd > numRows || rowStart > rowEnd) {
      throw new Error(`Invalid range: [${rowStart}, ${rowEnd}) for numRows: ${numRows}.`)
    }
    if (rowStart === rowEnd) {
      // If the range is empty, we can return.
      return
    }
    if (columns?.some((column) => !header.includes(column))) {
      throw new Error(`Invalid columns: ${columns.join(', ')}. Must be a subset of the header: ${header.join(', ')}.`)
    }
    validateOrderBy({ header, orderBy })

    // Ensure row numbers are available
    const indexes = await fetchIndexes({
      orderBy,
      signal,
      ranksByColumn,
      indexes: indexesByOrderBy.get(serializeOrderBy(orderBy)),
      setIndexes: ({ orderBy, indexes }) => {
        // Store the indexes in the map.
        indexesByOrderBy.set(serializeOrderBy(orderBy), indexes)
        // Notify the event target that the indexes have been updated.
        eventTarget.dispatchEvent(new CustomEvent('resolve'))
      },
      data,
    })
    // Ensure cells are available
    if (columns && columns.length > 0) {
      await fetchFromIndexes({ columns, signal, indexes: indexes.slice(rowStart, rowEnd), fetch: data.fetch })
    }
  }

  return {
    sortable: true,
    numRows,
    header: wrappedHeader,
    getRowNumber: wrappedGetRowNumber,
    getCell: wrappedGetCell,
    fetch: wrappedFetch,
    eventTarget,
  }
}

async function fetchFromIndexes({ columns, indexes, signal, fetch }: { columns?: string[], indexes: number[], signal?: AbortSignal, fetch: DataFrame['fetch'] }): Promise<void> {
  // Fetch the data for every index, grouping the fetches by consecutive rows.
  const rowNumberIndexes = indexes.sort()
  const promises: (void | Promise<void>)[] = []
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

export async function fetchIndexes({ orderBy, signal, ranksByColumn, setRanks, indexes, setIndexes, data }: { orderBy: OrderBy, signal?: AbortSignal, ranksByColumn?: Map<string, number[]>, setRanks?: ({ column, ranks }: {column: string, ranks: number[]}) => void, indexes?: number[], setIndexes?: ({ orderBy, indexes }: { orderBy: OrderBy, indexes: number[] }) => void, data: DataFrame }): Promise<number[]> {
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
async function fetchOrderByWithRanks({ orderBy, signal, ranksByColumn, setRanks, data }: {orderBy: OrderBy, signal?: AbortSignal, ranksByColumn?: Map<string, number[]>, setRanks?: ({ column, ranks }: {column: string, ranks: number[]}) => void, data: DataFrame }): Promise<OrderByWithRanks> {
  const orderByWithRanks: OrderByWithRanks = []
  const promises: Promise<any>[] = []

  for (const [i, { column, direction }] of orderBy.entries()) {
    if (!data.header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    const columnRanks = ranksByColumn?.get(column)
    if (columnRanks) {
      orderByWithRanks[i] = { direction, ranks: columnRanks }
    } else {
      promises.push(
        data.fetch({ rowStart: 0, rowEnd: data.numRows, columns: [column], signal }).then(() => {
          if (signal?.aborted) {
            throw new DOMException('Fetch aborted', 'AbortError')
          }
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
