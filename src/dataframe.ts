type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  rejected?: Error
}

/**
 * A row where each cell is a promise.
 * The promise must be wrapped with `wrapPromise` so that HighTable can render
 * the state synchronously.
 *
 * `__index__` is a promise that resolves to the row index in the "original data". Beware of
 * the collisions with the header keys.
 */
export type AsyncRow = Record<string, WrappedPromise<any>> & { __index__: WrappedPromise<number> }

/**
 * A row where each cell is a resolved value.
 *
 * `__index__` is the row index in the "original data". Beware of the collisions with the header keys.
 */
export type Row = Record<string, any> & { __index__: number }

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

export function resolvableRow(header: string[]): { [key: string]: ResolvablePromise<any> } & { __index__: ResolvablePromise<number> } {
  return Object.fromEntries([...header.map(key => [key, resolvablePromise<any>()]), ['__index__', resolvablePromise<number>()]])
}

/**
 * Helper method to wrap future rows into AsyncRows.
 * Helpful when you want to define a DataFrame with simple async fetching of rows.
 * This function turns future data into a "grid" of wrapped promises.
 */
export function asyncRows(rows: AsyncRow[] | Promise<Row[]>, numRows: number, header: string[]): AsyncRow[] {
  if (Array.isArray(rows)) return rows
  // Make grid of resolvable promises
  const wrapped = new Array(numRows).fill(null).map(_ => resolvableRow(header))
  rows.then(rows => {
    if (rows.length !== numRows) {
      console.warn(`Expected ${numRows} rows, got ${rows.length}`)
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      for (const key of header) {
        wrapped[i][key].resolve(row[key])
      }
      wrapped[i].__index__.resolve(row.__index__)
    }
  }).catch(error => {
    // Reject all promises on error
    for (let i = 0; i < numRows; i++) {
      for (const key of header) {
        wrapped[i][key].reject(error)
      }
      wrapped[i].__index__.reject(error)
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
  // Fetch all rows and set index
  let all: Promise<Row[]>
  return {
    ...data,
    rows(start: number, end: number, orderBy?: string): AsyncRow[] | Promise<Row[]> {
      if (orderBy) {
        if (!data.header.includes(orderBy)) {
          /// TODO(SL): should we allow '__index__'?
          throw new Error(`Invalid orderBy field: ${orderBy}`)
        }
        if (!all) {
          // Fetch all rows
          all = awaitRows(data.rows(0, data.numRows))
        }
        const sorted = all.then(all => {
          return all.sort((a, b) => {
            if (a[orderBy] < b[orderBy]) return -1
            if (a[orderBy] > b[orderBy]) return 1
            return 0
          }).slice(start, end)
        })
        return sorted
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
  const otherEntries = Object.entries(row).filter( ([key]) => key !== '__index__' )
  const [ __index__, ...values ] = await Promise.all([row.__index__, ...otherEntries.map( ([_, value]) => value )])
  return Object.fromEntries([
    ['__index__', __index__],
    ...otherEntries.map(([key, _], i) => [key, values[i]]),
  ])
}

/**
 * Await all promises in list of AsyncRows and return resolved rows.
 */
export function awaitRows(rows: AsyncRow[] | Promise<Row[]>): Promise<Row[]> {
  if (rows instanceof Promise) return rows
  return Promise.all(rows.map(awaitRow))
}

export function arrayDataFrame(data: Record<string, any>[]): DataFrame {
  if (!data.length) return { header: [], numRows: 0, rows: () => Promise.resolve([]) }
  return {
    header: Object.keys(data[0]).filter(key => key !== '__index__'),
    numRows: data.length,
    rows(start: number, end: number): Promise<Row[]> {
      return Promise.resolve(data.slice(start, end).map(
        (row, i) => ({ ...row, __index__: i + start })
      ))
    },
  }
}
