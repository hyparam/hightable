import { describe, expect, test } from 'vitest'

import { stringify } from '../../src/utils/stringify.js'

describe('stringify', () => {
  test('returns the same string if input is a string', () => {
    expect(stringify('Hello')).toBe('Hello')
  })

  test('returns the localized string if input is a number', () => {
    expect(stringify(4200)).toBe('4,200')
  })

  test('stringifies null and undefined as JSON', () => {
    expect(stringify(null)).toBe('null')
    expect(stringify(undefined)).toBe(undefined)
  })

  test('returns ISO string if input is a Date', () => {
    const date = new Date('2020-01-01T00:00:00.000Z')
    expect(stringify(date)).toBe('2020-01-01T00:00:00.000Z')
  })

  test('handles arrays', () => {
    expect(stringify([1, 2, 3])).toBe(`[
  1,
  2,
  3
]`)
    expect(stringify(['a', 'b'])).toBe(`[
  a,
  b
]`)
  })

  test('handles objects', () => {
    const obj = { a: 1, b: 'two' }
    expect(stringify(obj)).toBe('{\n  a: 1,\n  b: two\n}')
  })

  test('handles nested objects and arrays', () => {
    const nested = {
      a: [1, 2, { x: 'x' }],
      b: { c: 'hello' },
    }
    expect(stringify(nested)).toBe(`{
  a: [
    1,
    2,
    {
      x: x
    }
  ],
  b: {
    c: hello
  }
}`)
  })

  test('handles booleans', () => {
    expect(stringify(true)).toBe('true')
    expect(stringify(false)).toBe('false')
  })

  test('handles bigints', () => {
    expect(stringify(BigInt(123))).toBe('123')
    expect(stringify(BigInt(4200))).toBe('4,200')
  })
})
