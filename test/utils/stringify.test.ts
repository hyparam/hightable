import { describe, expect, test } from 'vitest'

import { stringify } from '../../src/utils/stringify.js'

describe('stringify', () => {
  test('returns the same string if input is a string', () => {
    expect(stringify('Hello')).toBe('Hello')
  })

  test('returns the localized string if input is a number', () => {
    expect(stringify(4200)).toBe('4,200')
    expect(stringify(3.14159265359)).toBe('3.1415927')
    expect(stringify(1.23456789)).toBe('1.2345679')
    expect(stringify(0.0000001)).toBe('0.0000001')
    expect(stringify(0.00000001)).toBe('0')
    expect(stringify(-0.00000001)).toBe('-0')
    expect(stringify(0)).toBe('0')
    expect(stringify(-0)).toBe('-0')
    expect(stringify(123.456)).toBe('123.456')
    expect(stringify(1000.123456789)).toBe('1,000.1234568')
    expect(stringify(1234567890)).toBe('1,234,567,890')
    expect(stringify(9876543210.125)).toBe('9,876,543,210.125')
    expect(stringify(1e15)).toBe('1,000,000,000,000,000')
    expect(stringify(1.23e20)).toBe('123,000,000,000,000,000,000')
    expect(stringify(Infinity)).toBe('∞')
    expect(stringify(-Infinity)).toBe('-∞')
    expect(stringify(NaN)).toBe('NaN')
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
    expect(stringify(BigInt(1234567890))).toBe('1,234,567,890')
    expect(stringify(BigInt(-1234567890))).toBe('-1,234,567,890')
  })

  test('handles errors', () => {
    expect(stringify(new Error('something went wrong'))).toBe('Error: something went wrong')
    expect(stringify(new TypeError('invalid type'))).toBe('TypeError: invalid type')
    expect(stringify(new RangeError('out of bounds'))).toBe('RangeError: out of bounds')
  })
})
