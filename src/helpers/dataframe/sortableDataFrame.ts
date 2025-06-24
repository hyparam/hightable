import { OrderBy, checkOrderBy } from '../sort.js'
import { CustomEventTarget, createEventTarget } from '../typedEventTarget.js'
import { CommonDataFrameEvents, ResolvedValue } from './types.js'
import { UnsortableDataFrame, fetchColumn } from './unsortableDataFrame.js'

export type Cells = Record<string, any>

// Map of event type -> detail
export interface SortableDataFrameEvents extends CommonDataFrameEvents {
  'dataframe:update': { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy };
}

/**
 * DataFrame is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface SortableDataFrame {
  numRows: number
  header: string[]
  sortable: true // indicates that this DataFrame supports sorting

  // return the index of the row'th sorted row in the original unsorted data
  getUnsortedRow({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> | undefined

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined

  // initiate fetches for row/column data
  // static data frames don't need to implement it
  // rowEnd is exclusive
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  fetch: ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void>

  // emits events, defined in DataFrameEvents
  // eventTarget can be used as follows:
  //
  // listen to an event:
  // eventTarget.addEventListener('dataframe:numrowschange', (event) => {
  //   console.log('Number of rows changed:', event.detail.numRows)
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: 42 } }))
  eventTarget: CustomEventTarget<SortableDataFrameEvents>
}

export function sortableDataFrame(unsortableDataFrame: UnsortableDataFrame): SortableDataFrame {
  // TODO(SL): move to their own helpers (rank.ts and sort.ts ?) and hide the implementation details in methods?
  // We could use TypedArrays to store the ranks, for example
  // TODO(SL): cache promises instead of resolved values? beware: how to handle abort signal?
  const ranksByColumn = new Map<string, number[]>()
  const indexesByOrderBy = new Map<string, number[]>()

  const eventTarget = createEventTarget<SortableDataFrameEvents>()
  unsortableDataFrame.eventTarget.addEventListener('dataframe:numrowschange', (event) => {
    // Forward the numRows change event to the sortable data frame
    eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: event.detail.numRows } }))
  })
  unsortableDataFrame.eventTarget.addEventListener('dataframe:update', (event) => {
    // Forward the update event to the sortable data frame
    const { rowStart, rowEnd, columns } = event.detail
    eventTarget.dispatchEvent(new CustomEvent('dataframe:update', { detail: { rowStart, rowEnd, columns } }))
  })
  // TODO(SL): the listeners are not removed, so we might leak memory if the sortableDataFrame is not used anymore.
  // We could add a method to remove the listeners (.dispose() ?).

  function getUnsortedRow({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> | undefined {
    if (row < 0 || row >= unsortableDataFrame.numRows) {
      // If the row is out of bounds, we can't resolve it.
      throw new Error(`Invalid row index: ${row}. Must be between 0 and ${unsortableDataFrame.numRows - 1}.`)
    }
    if (!orderBy || orderBy.length === 0) {
      // If no orderBy is provided, we can return the row as is.
      return { value: row }
    }
    checkOrderBy({ header: unsortableDataFrame.header, orderBy })
    const serializedOrderBy = serializeOrderBy(orderBy)
    const indexes = indexesByOrderBy.get(serializedOrderBy)
    const unsortedRowIndex = indexes?.[row]
    if (unsortedRowIndex === undefined) {
      return undefined
    }
    return { value: unsortedRowIndex }
  }

  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    const unsortedRow = getUnsortedRow({ row, orderBy })
    if (!unsortedRow) {
      // If we can't resolve the unsorted row, we return undefined.
      return undefined
    }
    return unsortableDataFrame.getCell({ row: unsortedRow.value, column })
  }

  async function fetch(args: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy, signal?: AbortSignal }): Promise<void> {
    // TODO?: no-op if the arguments have already been fetched once (we should cache with key:boolean, and (smartly) invalidate the cache on update)

    const { orderBy, ...rest } = args
    const { rowStart, rowEnd, columns, signal } = rest
    if (!orderBy || orderBy.length === 0) {
      // If orderBy is not provided, we can fetch the data without sorting.
      return unsortableDataFrame.fetch(rest)
    }

    // TODO: check the arguments (rowStart, rowEnd, columns, orderBy) and throw an error if they are invalid
    if (rowStart >= rowEnd) {
      // If the range is empty, we can return.
      return
    }
    checkOrderBy({ header: unsortableDataFrame.header, orderBy })
    const serializedOrderBy = serializeOrderBy(orderBy)
    let indexes = indexesByOrderBy.get(serializedOrderBy)

    if (!indexes) {
      // If the indexes are not cached, we need to compute them.
      // First, we fetch the ranks for each column in the orderBy.
      // If the ranks are already cached, we use them, otherwise we compute them.
      const orderByWithRanks = await fetchOrderByWithRanks({ orderBy, signal, ranksByColumn, unsortableDataFrame })
      // Compute the indexes using the ranks for each column in the orderBy.
      indexes = computeIndexes(orderByWithRanks)
      // Store the computed indexes in the map and emit an event.
      indexesByOrderBy.set(serializedOrderBy, indexes)
      eventTarget.dispatchEvent(new CustomEvent('dataframe:update', { detail: { rowStart, rowEnd, columns, orderBy } }))
    }

    return fetchFromIndexes({ columns, signal, indexes: indexes.slice(rowStart, rowEnd), unsortableFetch: unsortableDataFrame.fetch })
  }

  return {
    numRows: unsortableDataFrame.numRows,
    header: [...unsortableDataFrame.header],
    sortable: true,
    getUnsortedRow,
    getCell,
    fetch,
    eventTarget,
  }
}

function serializeOrderBy(orderBy: OrderBy): string {
  return JSON.stringify(orderBy)
}

async function fetchFromIndexes({ columns, indexes, signal, unsortableFetch }: { columns: string[], indexes: number[], signal?: AbortSignal, unsortableFetch: UnsortableDataFrame['fetch'] }): Promise<void> {
  // Fetch the data for every index, grouping the fetches by consecutive rows.
  const unsortedRowIndexes = indexes.sort()
  const promises: (void | Promise<void>)[] = []
  let range: [number, number] | undefined = undefined
  for (const row of unsortedRowIndexes) {
    if (range === undefined) {
      // First iteration
      range = [row, row + 1]
    } else if (range[1] === row) {
      // Consecutive row, extend the range.
      range[1] = row + 1
    } else {
      // The row is not consecutive, fetch the previous range and start a new one.
      promises.push(unsortableFetch({ rowStart: range[0], rowEnd: range[1], columns, signal }))
      range = [row, row + 1]
    }
  }
  if (range) {
    // Fetch the last range.
    promises.push(unsortableFetch({ rowStart: range[0], rowEnd: range[1], columns, signal }))
  }
  await Promise.all(promises)
}

/**
 * Compute the orderBy with ranks for each column.
 *
 * @param {Object} params
 * @param {OrderBy} params.orderBy The orderBy to compute ranks for.
 * @param {Map<string, Promise<number[]>>} params.ranksPromiseByColumn A map of column names to promises that resolve to their ranks.
 * @param {UnsortableDataFrame} params.unsortableDataFrame The unsortable data frame to compute ranks from.
 * @param {AbortSignal} [params.signal] A signal to cancel the computation. If the signal is aborted, the function rejects with an AbortError DOMException.
 *
 * @returns {Promise<{ direction: 'ascending' | 'descending', ranks: number[] }[]>} A promise that resolves to an array of objects containing the direction and ranks for each column in the orderBy.
 */
async function fetchOrderByWithRanks({ orderBy, signal, ranksByColumn, unsortableDataFrame }: {orderBy: OrderBy, signal?: AbortSignal, ranksByColumn: Map<string, number[]>, unsortableDataFrame: UnsortableDataFrame }): Promise<{ direction: 'ascending' | 'descending', ranks: number[] }[]> {
  const orderByWithRanks: {direction: 'ascending' | 'descending', ranks: number[] }[] = []
  const promises: Promise<any>[] = []

  for (const [i, { column, direction }] of orderBy.entries()) {
    if (!unsortableDataFrame.header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    const columnRanks = ranksByColumn.get(column)
    if (columnRanks) {
      orderByWithRanks[i] = { direction, ranks: columnRanks }
    } else {
      promises.push(
        fetchColumn({ unsortableDataFrame, column, signal }).then((columnValues) => {
          const ranks = computeRanks(columnValues)
          ranksByColumn.set(column, ranks)
          orderByWithRanks[i] = { direction, ranks }
        })
      )
    }
  }

  await Promise.all(promises)
  return orderByWithRanks
}

// return the column ranks in ascending order
// we can get the descending order replacing the rank with numRows - rank - 1. It's not exactly the rank of
// the descending order, because the rank is the first, not the last, of the ties. But it's enough for the
// purpose of sorting.
export function computeRanks(columnValues: any[]): number[] {
  const valuesWithIndex = columnValues.map((value, index) => ({ value, index }))
  const sortedValuesWithIndex = Array.from(valuesWithIndex).sort(({ value: a }, { value: b }) => {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  })
  const numRows = sortedValuesWithIndex.length
  const ascendingRanks = sortedValuesWithIndex.reduce(({ lastValue, lastRank, ranks }, { value, index }, rank) => {
    if (value === lastValue) {
      ranks[index] = lastRank
      return { ranks, lastValue, lastRank }
    } else {
      ranks[index] = rank
      return { ranks, lastValue: value, lastRank: rank }
    }
  }, { ranks: Array(numRows).fill(-1), lastValue: undefined, lastRank: 0 }).ranks
  return ascendingRanks
}

export function computeIndexes(orderBy: { direction: 'ascending' | 'descending', ranks: number[] }[]): number[] {
  if (!(0 in orderBy)) {
    throw new Error('orderBy should have at least one element')
  }
  const numRows = orderBy[0].ranks.length
  const indexes = Array.from({ length: numRows }, (_, i) => i)
  const dataIndexes = indexes.sort((a, b) => {
    for (const { direction, ranks } of orderBy) {
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
