import { describe, expect, it } from 'vitest'
import { resolvablePromise } from '../src/promise.js'

describe('resolvablePromise', () => {
  it('should resolve with a value', async () => {
    const wrapped = resolvablePromise<number>()
    wrapped.resolve(42)

    // the resolved value is not in the object yet
    expect(wrapped.resolved).toBe(undefined)

    // await the promise to get the value
    await expect(wrapped.promise).resolves.toBe(42)

    // the resolved value is stored in the wrapped object
    expect(wrapped.resolved).toBe(42)
    expect(wrapped.rejected).toBe(undefined)
  })
  it('should reject with an error', async () => {
    const wrapped = resolvablePromise<number>()
    wrapped.reject(new Error('Failed'))

    // the rejected error is not in the object yet
    expect(wrapped.rejected).toBe(undefined)

    // await the promise to get the error
    await expect(wrapped.promise).rejects.toThrow(new Error('Failed'))

    // the rejected error is stored in the wrapped object
    expect(wrapped.resolved).toBe(undefined)
    expect(wrapped.rejected).toBeInstanceOf(Error)
  })
})
