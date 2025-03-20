import { wrapPromise } from '../utils/promise.js'
import { AsyncRow, Cells, asyncRows } from './row.js'
import { OrderBy } from './sort.js'

/**
 * Function that gets values in a column.
 *
 * If start and end are provided, only get values in that range.
 * Negative start and end are allowed.
 *
 * @param column Column name
 * @param start Start index (inclusive)
 * @param end End index (exclusive)
 *
 * @returns Values in the column
 */
export type GetColumn = ({ column, start, end }: { column: string, start?: number, end?: number }) => Promise<any[]>

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  // if orderBy is provided, start and end are applied to the sorted rows
  // negative start and end are allowed
  rows({ start, end, orderBy }: { start: number, end: number, orderBy?: OrderBy }): AsyncRow[]
  // Get all values in a column. If start and end are provided, only get values in that range.
  getColumn?: GetColumn
  sortable?: boolean
}

/**
 * Return getColumn() function to apply on a DataFrame.
 *
 * Uses df.getColumn() if provided. Otherwise, it creates a naive implementation that
 * fetches full rows (AsyncRow) then extracts the column values.
 *
 * It will benefit of cached rows:
 * ```
 * const getColumn = getGetColumn(rowCache(data))
 * ```
 *
 * @param data DataFrame to add getColumn method to
 * @returns getColumn function
 */
export function getGetColumn(data: DataFrame): GetColumn {
  if (data.getColumn) return data.getColumn
  return function getColumn({ column, start = 0, end = data.numRows }): Promise<any[]> {
    if (!data.header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    return Promise.all(data.rows({ start, end }).map(row => row.cells[column]))
  }
}

// return the column ranks in ascending order
// we can get the descending order replacing the rank with numRows - rank - 1. It's not exactly the rank of
// the descending order, because the rank is the first, not the last, of the ties. But it's enough for the
// purpose of sorting.
export async function getRanks({ data, column }: {data: DataFrame, column: string}): Promise<number[]> {
  if (!data.header.includes(column)) {
    throw new Error(`Invalid column: ${column}`)
  }
  const getColumn = getGetColumn(data)
  const valuesWithIndex = (await getColumn({ column })).map((value, index) => ({ value, index }))
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

export function computeDataIndexes(orderBy: { direction: 'ascending' | 'descending', ranks: number[] }[]): number[] {
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
    return 0
  })
  // dataIndexes[0] gives the index of the first row in the sorted table
  return dataIndexes
}

export function getUnsortedRanks({ data }: { data: DataFrame }): Promise<number[]> {
  const { numRows } = data
  const ranks = Array.from({ length: numRows }, (_, i) => i)
  return Promise.resolve(ranks)
}

/**
 * Wraps a DataFrame to make it sortable.
 *
 * If the DataFrame is already sortable, it will return the original DataFrame.
 *
 * It takes advantage of cached rows to sort the data faster:
 * ```
 * const df = sortableDataFrame(rowCache(data))
 * ```
 *
 * If .getColumn() exists, it's used to sort the rows by the provided column.
 *
 * @param data DataFrame to make sortable
 * @returns DataFrame with sortable rows
 */
export function sortableDataFrame(data: DataFrame): DataFrame {
  if (data.sortable) return data // already sortable

  // TODO(SL): call addGetColumn() to cache the rows if needed
  // TODO(SL): create another type (DataFrameWithRanks?) that provides the cached ranks (and/or the cached data indexes for a given orderBy)

  const ranksByColumn = new Map<string, Promise<number[]>>()
  return {
    ...data,
    rows({ start, end, orderBy }): AsyncRow[] {
      if (orderBy && orderBy.length > 0) {
        if (orderBy.some(({ column }) => !data.header.includes(column)) ){
          throw new Error(`Invalid orderBy field: ${orderBy.map(({ column }) => column).join(', ')}`)
        }
        // TODO(SL): only fetch ranks if needed?
        // To get a consistent order in case of ties, we append a fake column orderby, to sort by the ascending indexes of the rows in the last case
        const orderByWithDefaultSort = [...orderBy, { column: '', direction: 'ascending' as const }]
        const orderByWithRanks = orderByWithDefaultSort.map(async ({ column, direction }) => {
          const ranksPromise = ranksByColumn.get(column) ?? (column === '' ? getUnsortedRanks({ data }) : getRanks({ data, column }))
          if (!ranksByColumn.has(column)) {
            ranksByColumn.set(column, ranksPromise)
          }
          const ranks = await ranksPromise
          return { column, direction, ranks }
        })
        // We cannot slice directly, because columns can have ties in the borders of the slice
        // TODO(SL): avoid sorting along the whole columns, maybe sort only the slice, and expand if needed
        const indexes = Promise.all(orderByWithRanks).then(computeDataIndexes)
        const indexesSlice = indexes.then(indexes => indexes.slice(start, end))
        const rowsSlice = indexesSlice.then(indexes => Promise.all(
          // TODO(SL): optimize to fetch groups of rows instead of individual rows?
          // if so: maybe the 'reverse' above should be done after fetching the rows
          indexes.map(i => {
            const asyncRowInArray = data.rows({ start: i, end: i + 1 })
            if (!(0 in asyncRowInArray)) {
              throw new Error('data.rows should have return one async row')
            }
            return asyncRowInArray[0]
          })
        ))
        return asyncRows(rowsSlice, end - start, data.header)
      } else {
        return data.rows({ start, end })
      }
    },
    sortable: true,
  }
}

export function arrayDataFrame(data: Cells[]): DataFrame {
  if (!(0 in data)) {
    return { header: [], numRows: 0, rows: () => [], getColumn: () => Promise.resolve([]) }
  }
  const header = Object.keys(data[0])
  return {
    header,
    numRows: data.length,
    rows({ start, end }): AsyncRow[] {
      return data.slice(start, end).map((cells, i) => ({
        index: wrapPromise(start + i),
        cells: Object.fromEntries(Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])),
      }))
    },
    getColumn({ column, start = 0, end = data.length }): Promise<any[]> {
      if (!header.includes(column)) {
        throw new Error(`Invalid column: ${column}`)
      }
      // TODO(SL): optimize to create the array without the intermediate slice?
      // beware: start and end can be negative, be sure to respect it when slicing
      return Promise.resolve(data.slice(start, end).map(row => row[column]))
    },
  }
}
