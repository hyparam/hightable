export type WrappedPromise<T> = {
  promise: Promise<T>
  resolved?: T
  rejected?: unknown
}

export function wrapPromise<T>(promise: Promise<T>): WrappedPromise<T>
export function wrapPromise<T>(resolved: T): WrappedPromise<T>
export function wrapPromise<T>(value: Promise<T> | T): WrappedPromise<T> {
  const wrappedPromise: WrappedPromise<T> = {
    promise: value instanceof Promise ? value : Promise.resolve(value),
  }
  // add resolved or rejected property to the asyncValue
  wrappedPromise.promise.then(value => {
    wrappedPromise.resolved = value
    wrappedPromise.rejected = undefined
    return value
  }).catch(error => {
    wrappedPromise.resolved = undefined
    wrappedPromise.rejected = error
    throw error
  })
  return wrappedPromise
}

export type ResolvablePromise<T> = WrappedPromise<T> & PromiseWithResolvers<T>

export function resolvablePromise<T>(): ResolvablePromise<T> {
  const promiseWithResolvers = Promise.withResolvers<T>()
  return Object.assign(promiseWithResolvers, wrapPromise<T>(promiseWithResolvers.promise))
}
