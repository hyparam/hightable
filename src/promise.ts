export type WrappedPromise<T> = {
  promise: Promise<T>
  resolved?: T
  rejected?: unknown
}

export function wrapPromise<T>(promise: Promise<T>): WrappedPromise<T>
export function wrapPromise<T>(resolved: T): WrappedPromise<T>
export function wrapPromise<T>(input: Promise<T> | T): WrappedPromise<T> {
  const wrapped: WrappedPromise<T> = {
    promise: input instanceof Promise ? input : Promise.resolve(input),
  }
  // add resolved or rejected property to the wrapped object
  wrapped.promise.then(resolved => {
    wrapped.resolved = resolved
    wrapped.rejected = undefined
    return resolved
  }).catch(rejected => {
    wrapped.resolved = undefined
    wrapped.rejected = rejected
    throw rejected
  })
  return wrapped
}

export type ResolvablePromise<T> = WrappedPromise<T> & PromiseWithResolvers<T>

// Promise.withResolvers is too recent. Let's use the polyfill instead.
export function withResolvers<T>(): PromiseWithResolvers<T> {
  let resolve!: PromiseWithResolvers<T>['resolve']
  let reject!: PromiseWithResolvers<T>['reject']
  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_
    reject = reject_
  })
  return { promise, resolve, reject }
}

export function resolvablePromise<T>(): ResolvablePromise<T> {
  const w = withResolvers<T>()
  const wrapped = wrapPromise(w.promise)
  return Object.assign(wrapped, w)
}
