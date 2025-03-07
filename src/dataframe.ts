import { wrapPromise } from './promise.js'
import { AsyncRow, Cells, asyncRows } from './row.js'

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
  rows({ start, end, orderBy }: { start: number, end: number, orderBy?: string }): AsyncRow[]
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

export async function getColumnIndex({ data, column }: {data: DataFrame, column: string}): Promise<number[]> {
  if (!data.header.includes(column)) {
    throw new Error(`Invalid column: ${column}`)
  }
  const getColumn = getGetColumn(data)
  const values = await getColumn({ column })
  return Array.from(values.keys()).sort((a, b) => {
    if (values[a] < values[b]) return -1
    if (values[a] > values[b]) return 1
    return 0
  })
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

  const indexesByColumn = new Map<string, Promise<number[]>>()
  return {
    ...data,
    rows({ start, end, orderBy: column }): AsyncRow[] {
      if (column) {
        if (!data.header.includes(column)) {
          throw new Error(`Invalid orderBy field: ${column}`)
        }
        const columnIndexes = indexesByColumn.get(column) ?? getColumnIndex({ data, column })
        if (!indexesByColumn.has(column)) {
          indexesByColumn.set(column, columnIndexes)
        }
        const indexesSlice = columnIndexes.then(indexes => indexes.slice(start, end))
        const rowsSlice = indexesSlice.then(indexes => Promise.all(
          // TODO(SL): optimize to fetch groups of rows instead of individual rows?
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
