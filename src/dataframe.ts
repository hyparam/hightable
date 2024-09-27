type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  rejected?: Error
}

/**
 * A row where each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously.
 */
export type AsyncRow = Record<string, WrappedPromise<any>>

/**
 * A row where each cell is a resolved value.
 */
export type Row = Record<string, any>

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  rows(start: number, end: number, orderBy?: string): AsyncRow[] | Promise<Row[]>
  sortable?: boolean
}

/**
 * Helper method to wrap future rows into AsyncRows.
 * Helpful when you want to define a DataFrame with simple async fetching of rows.
 * This function turns future data into a "grid" of wrapped promises.
 */
export function asyncRows(rows: AsyncRow[] | Promise<Row[]>, numRows: number, keys: string[]): AsyncRow[] {
  const wrapped = new Array(numRows).fill(null)
    .map(_ => Object.fromEntries(keys.map(key => [key, resolvablePromise<any>()])))
  const futureRows = rows instanceof Promise ? rows : Promise.resolve(rows)
  futureRows.then(rows => {
    if (rows.length !== numRows) {
      throw new Error(`Expected ${numRows} rows, got ${rows.length}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (const key in row) {
        wrapped[i][key].resolve(row[key])
      }
    }
  }).catch(error => {
    // Reject all promises on error
    for (let i = 0; i < numRows; i++) {
      for (const key of keys) {
        wrapped[i][key].reject(error)
      }
    }
  })
  return wrapped
}

/**
 * Wrap a promise to save the resolved value and error.
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

type ResolvablePromise<T> = Promise<T> & {
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
  // Fetch all rows and add __index__ column
  const keys = ['__index__', ...data.header]
  const all: Promise<Record<string, any>[]> = awaitRows(data.rows(0, data.numRows))
    .then(rows => rows.map((row, i) => ({ __index__: i, ...row })))
  return {
    ...data,
    rows(start: number, end: number, orderBy?: string): AsyncRow[] | Promise<Row[]> {
      if (orderBy) {
        if (!data.header.includes(orderBy)) {
          throw new Error(`Invalid orderBy field: ${orderBy}`)
        }
        const sorted = all.then(all => {
          return all.sort((a, b) => {
            if (a[orderBy] < b[orderBy]) return -1
            if (a[orderBy] > b[orderBy]) return 1
            return 0
          }).slice(start, end)
        })
        return asyncRows(sorted, end - start, keys)
      } else {
        return data.rows(start, end)
      }
    },
    sortable: true,
  }
}

function awaitRow(row: AsyncRow): Promise<Row> {
  return Promise.all(Object.values(row))
    .then(values => Object.fromEntries(Object.keys(row).map((key, i) => [key, values[i]])))
}

export function awaitRows(rows: AsyncRow[] | Promise<Row[]>): Promise<Row[]> {
  if (rows instanceof Promise) return rows
  return Promise.all(rows.map(awaitRow))
}
