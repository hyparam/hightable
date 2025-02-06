type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  rejected?: Error
}
// TODO(SL) maybe improve the type or structure so that the user does not provide a simple promise
// maybe force adding a "pending: true" key while it's not resolved or rejected?
// eg: {pending: true} | {resolved: T} | {rejected: Error}

/**
 * A row where each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously.
 */
export interface AsyncRow {
  cells: Record<string, WrappedPromise<any>>
  index: WrappedPromise<number>
}

type Cells = Record<string, any>

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

/**
 * Wrap a promise to save the resolved value and error.
 * Note: you can't await on a WrappedPromise, you must use then.
 */
export function wrapPromise<T>(promise: Promise<T> | T): WrappedPromise<T> {
  if (!(promise instanceof Promise)) {
    promise = Promise.resolve(promise)
  }
  const wrapped: WrappedPromise<T> = promise.then(resolved => {
    wrapped.resolved = resolved
    return resolved
  }).catch(rejected => {
    wrapped.rejected = rejected
    throw rejected
  })
  return wrapped
}

export type ResolvablePromise<T> = Promise<T> & {
  resolve: (value: T) => void
  reject: (error: Error) => void
}

/**
 * Create a promise that can be resolved or rejected later.
 */
export function resolvablePromise<T>(): ResolvablePromise<T> {
  let resolve: (value: T) => void
  let reject: (error: Error) => void
  const promise = wrapPromise(new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })) as ResolvablePromise<T>
  promise.resolve = resolve!
  promise.reject = reject!
  return promise
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
