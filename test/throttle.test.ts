import { beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from '../src/HighTable.js'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('calls the function immediately', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('calls the function again after wait time', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    vi.advanceTimersByTime(101)
    throttledFn()

    // First call is immediate, second call is after wait
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('calls the function on the trailing edge if called again within wait time', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    vi.advanceTimersByTime(50)
    throttledFn() // second call within wait time
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(49)
    // still within wait -> no new call yet
    expect(fn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    // trailing edge call should fire now
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('only makes one trailing call even if multiple calls happen within wait window', () => {
    const fn = vi.fn()
    const throttledFn = throttle(fn, 100)

    throttledFn()
    for (let i = 0; i < 5; i++) {
      throttledFn()
    }

    expect(fn).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(100)
    // only one trailing call despite multiple calls in the wait period
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
