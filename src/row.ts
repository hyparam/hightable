import { ResolvablePromise, WrappedPromise, resolvablePromise } from './promise.js'

// TODO(SL): replace any with unknown everywhere, as it's more typesafe + add typescript check

/**
 * A dictionary of cells, where the key is the column name and the value is the cell value.
 */
export type Cells = Record<string, any>

/**
 * A data row.
 * `index` is the row index.
 * `cells` is a dictionary of cells
 */
export interface Row {
  index: number
  cells: Cells
}

/**
 * A partial row, where the index and the cells can be missing.
 */
export interface PartialRow {
  index?: number
  cells: Partial<Cells> // I added Partial for clarity, even if the result is the same
}

/**
 * A row where the index and each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously:
 * - index.promise is the promise for the row index
 * - index.resolved, if present, is the resolved value of the row index
 * - index.rejected, if present, is the error of rejected promise for the row index
 * The same applies to each cell.
 */
export interface AsyncRow {
  index: WrappedPromise<number>
  cells: Record<string, WrappedPromise<any>>
}

/**
 * A row where the index and each cell is a resolvable promise.
 *
 * A resolvable row is used as a placeholder for a row that will be filled "manually"
 * in the future, using the resolve/reject methods on the index and each cell.
 * The promise will not resolve automatically. It is wrapped (with `wrapPromise`)
 * so that the resolved value can be accessed synchronously using `.resolved`.
 *
 * Use `resolvableRow` to create a new resolvable row, or `resolvablePromise` to
 * create a new resolvable promise.
 */
export interface ResolvableRow {
  index: ResolvablePromise<number>
  cells: Record<string, ResolvablePromise<any>>
}

/**
 * Create a new resolvable row.
 *
 * @param header the column names.
 *
 * @returns A new resolvable row.
 */
export function resolvableRow(header: string[]): ResolvableRow {
  return {
    index: resolvablePromise<number>(),
    cells: Object.fromEntries(header.map(key => [key, resolvablePromise<any>()])),
  }
}

/**
 * Helper method to wrap future rows into AsyncRows.
 * Helpful when you want to define a DataFrame with simple async fetching of rows.
 * This function turns future data into a "grid" of wrapped promises.
 *
 * @param rowsPromise Promise of rows to be fetched.
 * @param numRows Number of expected rows when the promise resolves.
 * @param header Column names.
 *
 * @returns Array of AsyncRows.
 */
export function asyncRows(rowsPromise: Promise<Row[]>, numRows: number, header: string[]): AsyncRow[] {
  // Make grid of resolvable promises
  const resolvableRows = new Array(numRows).fill(null).map(_ => resolvableRow(header))
  rowsPromise.then(rows => {
    if (rows.length !== numRows) {
      console.warn(`Expected ${numRows} rows, got ${rows.length}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (const key of header) {
        resolvableRows[i].cells[key].resolve(row.cells[key])
      }
      resolvableRows[i].index.resolve(row.index)
    }
  }).catch(error => {
    // Reject all promises on error
    for (let i = 0; i < numRows; i++) {
      for (const key of header) {
        resolvableRows[i].cells[key].reject(error)
      }
      resolvableRows[i].index.reject(error)
    }
  })
  // TODO(SL): should we 'hide' the resolve/reject methods in the returned objects for them to be
  // 'real' AsyncRow, or is it fine to return ResolvableRow?
  return resolvableRows
}

/**
 * Await all promises (index, cells) in an AsyncRow and return resolved row.
 *
 * @param row AsyncRow
 *
 * @returns Promise of resolved row.
 */
export async function awaitRow(row: AsyncRow): Promise<Row> {
  const indexPromise = row.index.promise
  const valuePromises = Object.values(row.cells).map(d => d.promise)
  const cellKeys = Object.keys(row.cells)
  const [index, ...values] = await Promise.all([indexPromise, ...valuePromises])
  return {
    index,
    cells: Object.fromEntries(cellKeys.map((key, i) => [key, values[i]])),
  }
}

/**
 * Helper method to await async rows (resolve all indexes and cells) and return resolved rows.
 *
 * @param rows Array of AsyncRows
 *
 * @returns Promise of resolved rows.
 */
export function awaitRows(rows: AsyncRow[]): Promise<Row[]> {
  return Promise.all(rows.map(awaitRow))
}
