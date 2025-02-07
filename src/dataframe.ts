import { wrapPromise } from './promise.js'
import { AsyncRow, Cells, Row, asyncRows, awaitRows } from './row.js'

/**
 * A DataFrame is a table of data with a header and rows.
 */
export interface DataFrame {
  /**
   * an array of strings representing the column names.
   */
  header: string[]
  /**
   * the total number of rows in the DataFrame.
   */
  numRows: number
  /**
   * get a slice of rows from the DataFrame.
   *
   * If sorted (orderBy is provided), the slice is applied to the sorted rows.
   * Otherwise, the slice is applied to the original rows.
   *
   * The slice is 0-indexed and excludes the header.
   *
   * @param start the index of the first row to include.
   * @param end the index of the first row to exclude.
   * @param orderBy the column name to sort the rows by.
   *
   * @returns an array of AsyncRow objects (with wrapped promises for index and cells).
   */
  rows(start: number, end: number, orderBy?: string): AsyncRow[]
  /**
   * whether the DataFrame is sortable.
   */
  sortable?: boolean
}

/**
 * Wraps a DataFrame to make it sortable.
 * Requires fetching all rows to sort.
 *
 * @param data The DataFrame to make sortable.
 *
 * @returns A new DataFrame that can be sorted.
 */
export function sortableDataFrame(data: DataFrame): DataFrame {
  if (data.sortable) return data // already sortable
  // Fetch all rows
  let all: Promise<Row[]>
  return {
    ...data,
    rows(start: number, end: number, orderBy?: string): AsyncRow[] {
      if (orderBy) {
        if (!data.header.includes(orderBy)) {
          throw new Error(`Invalid orderBy field: ${orderBy}`)
        }
        // TODO(SL): ideas for optimization:
        // 1. create the sorted index (index => index) if missing, by fetching only the column orderBy and sorting it
        // 2. use the cached sorted index to fetch the rows at the right indexes
        // Note: the index might an optional method of DataFrame: index(orderBy: string): Promise<{direct: number[], reverse: number[]}>
        // with a default implementation here if not provided.
        // Maybe use typed arrays for performance.
        if (!all) {
          // Fetch all rows
          all = awaitRows(data.rows(0, data.numRows))
        }
        const sorted = all.then(all => {
          return all.sort((a, b) => {
            if (a.cells[orderBy] < b.cells[orderBy]) return -1
            if (a.cells[orderBy] > b.cells[orderBy]) return 1
            return 0
          }).slice(start, end)
        })
        return asyncRows(sorted, end - start, data.header)
      } else {
        return data.rows(start, end)
      }
    },
    sortable: true,
  }
}

/**
 * Create a dataframe from an array of rows.
 *
 * The header (column names) is created from the keys of the first row.
 *
 * @param data An array of rows.
 *
 * @returns DataFrame object.
 */
export function arrayDataFrame(data: Cells[]): DataFrame {
  if (!data.length) return { header: [], numRows: 0, rows: () => [] }
  return {
    header: Object.keys(data[0]),
    numRows: data.length,
    rows(start: number, end: number): AsyncRow[] {
      return data.slice(start, end).map((cells, i) => ({
        index: wrapPromise(start + i),
        cells: Object.fromEntries(Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])),
      }))
    },
  }
}
