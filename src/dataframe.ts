import { wrapPromise } from './promise.js'
import { AsyncRow, Cells, Row, asyncRows, awaitRows } from './row.js'

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  // if orderBy is provided, start and end are applied to the sorted rows
  rows(start: number, end: number, orderBy?: string): AsyncRow[]
  sortable?: boolean
}

/**
 * Wraps a DataFrame to make it sortable.
 * Requires fetching all rows to sort.
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
