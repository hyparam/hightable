import { ResolvablePromise, WrappedPromise, resolvablePromise } from './promise.js'

/**
 * A row where each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously.
 */
export interface AsyncRow {
  cells: Record<string, WrappedPromise<any>>
  index: WrappedPromise<number>
}

export type Cells = Record<string, any>

/**
 * A row where each cell is a resolved value.
 */
export interface Row {
  cells: Cells
  index: number
}

export interface PartialRow {
  index?: number
  cells: Cells
}

export interface ResolvableRow {
  cells: Record<string, ResolvablePromise<any>>
  index: ResolvablePromise<number>
}

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
 */
export function asyncRows(rows: Promise<Row[]>, numRows: number, header: string[]): AsyncRow[] {
  // Make grid of resolvable promises
  const wrapped = new Array(numRows).fill(null).map(_ => resolvableRow(header))
  rows.then(rows => {
    if (rows.length !== numRows) {
      console.warn(`Expected ${numRows} rows, got ${rows.length}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (const key of header) {
        wrapped[i].cells[key].resolve(row.cells[key])
      }
      wrapped[i].index.resolve(row.index)
    }
  }).catch(error => {
    // Reject all promises on error
    for (let i = 0; i < numRows; i++) {
      for (const key of header) {
        wrapped[i].cells[key].reject(error)
      }
      wrapped[i].index.reject(error)
    }
  })
  return wrapped
}

export function asyncRowsPromiseToAsyncRows(rows: Promise<AsyncRow[]>, numRows: number, header: string[]): AsyncRow[] {
  const wrapped = new Array(numRows).fill(null).map(_ => resolvableRow(header))
  rows.then(rows => {
    if (rows.length !== numRows) {
      console.warn(`Expected ${numRows} rows, got ${rows.length}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (const key of header) {
        // each cell can reject or resolve
        row.cells[key].then(cell => wrapped[i].cells[key].resolve(cell)).catch(error => wrapped[i].cells[key].reject(error))
      }
      // the index can reject or resolve
      row.index.then(index => wrapped[i].index.resolve(index)).catch(error => wrapped[i].index.reject(error))
    }
  }).catch(error => {
    // Reject all promises on error
    for (let i = 0; i < numRows; i++) {
      for (const key of header) {
        wrapped[i].cells[key].reject(error)
      }
      wrapped[i].index.reject(error)
    }
  })
  return wrapped
}


/**
 * Await all promises in an AsyncRow and return resolved row.
 */
export async function awaitRow(row: AsyncRow): Promise<Row> {
  const indexPromise = row.index
  const cellPromises = Object.values(row.cells)
  const cellKeys = Object.keys(row.cells)
  const [resolvedIndex, ...resolvedOtherValues] = await Promise.all([indexPromise, ...cellPromises])
  return {
    index: resolvedIndex,
    cells: Object.fromEntries(cellKeys.map((key, i) => [key, resolvedOtherValues[i]])),
  }
}

/**
   * Await all promises in list of AsyncRows and return resolved rows.
   */
export function awaitRows(rows: AsyncRow[]): Promise<Row[]> {
  return Promise.all(rows.map(awaitRow))
}
