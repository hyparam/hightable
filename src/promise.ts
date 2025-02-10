export type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  rejected?: Error
}
// TODO(SL) maybe improve the type or structure so that the user does not provide a simple promise
// maybe force adding a "pending: true" key while it's not resolved or rejected?
// eg: {pending: true} | {resolved: T} | {rejected: Error}

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
