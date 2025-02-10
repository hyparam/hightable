export type WrappedPromise<T> = {
  promise: Promise<T>
  resolved?: T
  rejected?: unknown
}

export function wrapPromise<T>(promise: Promise<T>): WrappedPromise<T>
export function wrapPromise<T>(resolved: T): WrappedPromise<T>
export function wrapPromise<T>(input: Promise<T> | T): WrappedPromise<T> {
  const wrappedPromise: WrappedPromise<T> = {
    promise: input instanceof Promise ? input : Promise.resolve(input),
  }
  // add resolved or rejected property to the wrapped promise
  wrappedPromise.promise.then(resolved => {
    wrappedPromise.resolved = resolved
    wrappedPromise.rejected = undefined
    return resolved
  }).catch(rejected => {
    wrappedPromise.resolved = undefined
    wrappedPromise.rejected = rejected
    throw rejected
  })
  return wrappedPromise
}

export type ResolvablePromise<T> = WrappedPromise<T> & PromiseWithResolvers<T>

export function resolvablePromise<T>(): ResolvablePromise<T> {
  // const promiseWithResolvers = Promise.withResolvers<T>()
  // Promise.withResolvers is too recent. Let's use the polyfill instead.
  let resolve: PromiseWithResolvers<T>['resolve']
  let reject: PromiseWithResolvers<T>['reject']
  const promise = new Promise<T>((resolve_, reject_) => {
    resolve = resolve_
    reject = reject_
  })
  const promiseWithResolvers = { promise, resolve: resolve!, reject: reject! }

  return Object.assign(promiseWithResolvers, wrapPromise<T>(promiseWithResolvers.promise))
}
