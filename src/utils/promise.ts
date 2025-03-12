export type WrappedPromise<T> = Promise<T> & {
  resolved?: T
  rejected?: any
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
  }).catch((rejected: unknown) => {
    wrapped.rejected = rejected
    throw rejected
  })
  return wrapped
}

export type ResolvablePromise<T> = Promise<T> & {
  resolve: (value: T) => void
  reject: (reason?: any) => void
}

/**
 * Create a promise that can be resolved or rejected later.
 */
export function resolvablePromise<T>(): ResolvablePromise<T> {
  let resolve: (value: T) => void
  let reject: (reason?: any) => void
  const promise = wrapPromise(new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })) as ResolvablePromise<T>
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  promise.resolve = resolve!
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  promise.reject = reject!
  return promise
}
