type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  error?: Error
}

type Row = {
  __index__?: number
} & Record<string, WrappedPromise<any>>

export function wrappedPromise(promise: Promise<any>): WrappedPromise<any> {
  const wrapped = promise as WrappedPromise<any>
  promise.then(resolved => wrapped.resolved = resolved)
  promise.catch(error => wrapped.error = error)
  return wrapped
}

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  rows(start: number, end: number, orderBy?: string): Row[]
  sortable?: boolean
}
