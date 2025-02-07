import { describe, expect, it } from 'vitest'
import { resolvablePromise } from '../src/promise.js'

describe('resolvablePromise', () => {
  it('should resolve with a value', async () => {
    const { promise, resolve } = resolvablePromise<number>()
    resolve(42)
    await expect(promise).resolves.toBe(42)
  })
  it('should reject with an error', async () => {
    const { promise, reject } = resolvablePromise<number>()
    reject(new Error('Failed'))
    await expect(promise).rejects.toThrow('Failed')
  })
})
