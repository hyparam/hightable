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

export function resolvablePromise<T>(): ResolvablePromise<T> {
  // Promise.withResolvers is too recent. Let's use the polyfill instead.
  let resolve: PromiseWithResolvers<T>['resolve']
  let reject: PromiseWithResolvers<T>['reject']
  const wrapped = wrapPromise(new Promise<T>((resolve_, reject_) => {
    resolve = resolve_
    reject = reject_
  }))
  return Object.assign(wrapped, { resolve: resolve!, reject: reject! })
}
