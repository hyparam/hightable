import { describe, expect, it } from 'vitest'
import { resolvablePromise } from '../../src/utils/promise.js'

describe('resolvablePromise', () => {
  it('should resolve with a value', async () => {
    const promise = resolvablePromise<number>()
    promise.resolve(42)
    await expect(promise).resolves.toBe(42)
  })
  it('should reject with an error', async () => {
    const promise = resolvablePromise<number>()
    promise.reject(new Error('Failed'))
    await expect(promise).rejects.toThrow('Failed')
  })
})
