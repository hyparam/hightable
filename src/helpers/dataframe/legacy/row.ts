import { ResolvablePromise, WrappedPromise, resolvablePromise } from './promise.js'

/**
 * A row where each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously.
 * Raise an error with format: {numRows: number} if the row cannot be resolved because
 * it's beyond the max number of rows (eg: iceberg position/equality deletes, or filtered rows).
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
export function asyncRows(rows: Promise<Row[] | AsyncRow[]>, numRows: number, header: string[]): AsyncRow[] {
  // Make grid of resolvable promises
  const wrapped = new Array(numRows).fill(null).map(() => resolvableRow(header))
  rows.then(rows => {
    if (rows.length !== numRows) {
      console.warn(`Expected ${numRows} rows, got ${rows.length}`)
    }
    rows.forEach((row, i) => {
      const wrappedRow = wrapped[i]
      if (wrappedRow === undefined) {
        throw new Error(`Expected row ${i} to exist`)
      }
      for (const key of header) {
        const wrappedCell = wrappedRow.cells[key]
        if (wrappedCell === undefined) {
          throw new Error(`Expected cell ${key} to exist in row ${i}`)
        }
        if (row.cells[key] instanceof Promise) {
          // each cell can reject or resolve
          row.cells[key].then(cell => { wrappedCell.resolve(cell) }).catch(error => { wrappedCell.reject(error) })
        } else {
          wrappedCell.resolve(row.cells[key])
        }
      }
      if (row.index instanceof Promise) {
        // the index can reject or resolve
        row.index.then(index => { wrappedRow.index.resolve(index) }).catch(error => { wrappedRow.index.reject(error) })
      } else {
        wrappedRow.index.resolve(row.index)
      }
    }
    )}).catch(error => {
    // Reject all promises on error
    wrapped.forEach((wrappedRow) => {
      for (const promise of Object.values(wrappedRow.cells)) {
        promise.reject(error)
      }
      wrappedRow.index.reject(error)
    })
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
