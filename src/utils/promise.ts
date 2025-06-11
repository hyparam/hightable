// export type WrappedPromise<T> = Promise<T> & {
//   resolved?: T
//   rejected?: any
// }

// export type ResolvablePromise<T> = Promise<T> & {
//   resolve: (value: T) => void
//   reject: (reason?: any) => void
// }

// /**
//  * Wrap a promise to save the resolved value and error.
//  * Note: you can't await on a WrappedPromise, you must use then.
//  */
// export function wrapPromise<T>(promise: Promise<T>): WrappedPromise<T> {
//   const wrapped: WrappedPromise<T> = promise.then(resolved => {
//     wrapped.resolved = resolved
//     return resolved
//   }).catch((rejected: unknown) => {
//     wrapped.rejected = rejected
//     throw rejected
//   })
//   return wrapped
// }

// /**
//  * Similar to `wrapPromise`, but for a resolved value.
//  * Returns immediately without creating a microtask.
//  */
// export function wrapResolved<T>(value: T): WrappedPromise<T> {
//   const wrapped: WrappedPromise<T> = Promise.resolve(value) as WrappedPromise<T>
//   wrapped.resolved = value
//   return wrapped
// }

// /**
//  * Create a promise that can be resolved or rejected later.
//  */
// export function resolvablePromise<T>(): ResolvablePromise<T> {
//   let resolve: (value: T) => void
//   let reject: (reason?: any) => void
//   const promise = new Promise<T>((res, rej) => {
//     resolve = res
//     reject = rej
//   }) as ResolvablePromise<T> & WrappedPromise<T>
//   promise.resolve = result => {
//     promise.resolved = result
//     resolve(result)
//   }
//   promise.reject = error => {
//     promise.rejected = error
//     reject(error)
//   }
//   return promise
// }
