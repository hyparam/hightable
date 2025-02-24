import { wrapPromise } from './promise.js'
import { AsyncRow, Cells, asyncRowsPromiseToAsyncRows } from './row.js'

export interface RowsArgs {
  start: number
  end: number
  orderBy?: string
}

export interface GetColumnArgs {
  column: string
  start?: number
  end?: number
}

export type GetColumn = (args: GetColumnArgs) => Promise<any[]>

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  // if orderBy is provided, start and end are applied to the sorted rows
  rows(args: RowsArgs): AsyncRow[]
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
  return function getColumn({ column, start = 0, end = data.numRows }: GetColumnArgs): Promise<any[]> {
    if (!data.header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    return Promise.all(data.rows({ start, end }).map(row => row.cells[column]))
  }
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
  const getColumn = getGetColumn(data)
  const indexesByColumn = new Map<string, Promise<number[]>>()
  return {
    ...data,
    rows({ start, end, orderBy }: RowsArgs): AsyncRow[] {
      if (orderBy) {
        if (!data.header.includes(orderBy)) {
          throw new Error(`Invalid orderBy field: ${orderBy}`)
        }
        if (!indexesByColumn.has(orderBy)) {
          indexesByColumn.set(orderBy, getColumn({ column: orderBy }).then(values =>
            Array.from(values.keys())
              .sort((a, b) => {
                if (values[a] < values[b]) return -1
                if (values[a] > values[b]) return 1
                return 0
              })
          ))
        }
        const indexesSlice = indexesByColumn.get(orderBy)!.then(indexes => indexes.slice(start, end))
        const promiseToRowsSlice = indexesSlice.then(indexes => Promise.all(indexes.map(i => data.rows({ start: i, end: i + 1 })[0])))
        return asyncRowsPromiseToAsyncRows(promiseToRowsSlice, end - start, data.header)
      } else {
        return data.rows({ start, end })
      }
    },
    sortable: true,
  }
}

export function arrayDataFrame(data: Cells[]): DataFrame {
  if (!data.length) return { header: [], numRows: 0, rows: () => [] }
  const header = Object.keys(data[0])
  return {
    header,
    numRows: data.length,
    rows({ start, end }: RowsArgs): AsyncRow[] {
      return data.slice(start, end).map((cells, i) => ({
        index: wrapPromise(start + i),
        cells: Object.fromEntries(Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])),
      }))
    },
    getColumn({ column, start = 0, end = data.length }: GetColumnArgs): Promise<unknown[]> {
      if (!header.includes(column)) {
        throw new Error(`Invalid column: ${column}`)
      }
      start = Math.floor(Math.max(0, start))
      end = Math.floor(Math.min(data.length, end))
      if (start >= end) {
        return Promise.resolve([])
      }
      return Promise.resolve(Array(end - start).fill(null).map((_, i) => data[start + i][column]))
    },
  }
}
