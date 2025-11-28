import { describe, expect, it, vi } from 'vitest'
import { arrayDataFrame } from '../../../src/helpers/dataframe/index.js'

describe('arrayDataFrame', () => {
  const testData = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: 'Charlie', age: 35 },
  ]

  it('should create a DataFrame with correct colummn descriptors and numRows', () => {
    const df = arrayDataFrame(testData)
    expect(df.columnDescriptors).toEqual(['id', 'name', 'age'].map(name => ({ name })))
    expect(df.numRows).toBe(3)
  })

  it('should return the cell value without first fetching the column', () => {
    const df = arrayDataFrame(testData)
    const cell = df.getCell({ row: 1, column: 'name' })
    expect(cell?.value).toBe('Bob')
  })

  it('should throw if accessing data from an unknown column', () => {
    const df = arrayDataFrame(testData)
    expect(() => {
      df.getCell({ row: 0, column: 'doesnotexist' } )
    }).toThrow('Invalid column: doesnotexist')
  })

  it('should throw if accessing data from an unknown row', () => {
    const df = arrayDataFrame(testData)
    expect(() => {
      df.getCell({ row: 3, column: 'id' } )
    }).toThrow('Invalid row index: 3')
  })

  it('should throw if accessing data from an empty array', () => {
    const df = arrayDataFrame([])
    expect(df.columnDescriptors).toEqual([])
    expect(df.numRows).toBe(0)
    expect(() => {
      df.getCell({ row: 0, column: 'name' } )
    }).toThrow('Invalid row index: 0')
  })

  it('does not provides fetch', () => {
    const df = arrayDataFrame([])
    expect(df.fetch).toBeUndefined()
  })

  it('provides an event target', () => {
    const df = arrayDataFrame([])
    expect(df.eventTarget).toBeDefined()
  })

  it('provides a proxy to the underlying array in the metadata', () => {
    const df = arrayDataFrame(testData)
    expect(df.metadata?.array).toBeDefined()
    expect(df.metadata?.array).not.toBe(testData)
    expect(df.metadata?.array).toEqual(testData)
  })

  it('dispatches events on the event target on row changes (shallow)', () => {
    const df = arrayDataFrame(testData)
    const rowListener = vi.fn()
    const resolveListener = vi.fn()
    df.eventTarget?.addEventListener('numrowschange', rowListener)
    df.eventTarget?.addEventListener('resolve', resolveListener)

    expect(df.numRows).toBe(3)
    df._array.push({ id: 4, name: 'Diana', age: 28 })
    expect(resolveListener).toHaveBeenCalled()
    expect(rowListener).toHaveBeenCalled()
    expect(df.numRows).toBe(4)

    // when an array element (a row) is replaced, the "resolve" event is dispatched
    df._array[0] = { id: 1, name: 'Alicia', age: 30 }
    expect(resolveListener).toHaveBeenCalledTimes(2)
    expect(rowListener).toHaveBeenCalledTimes(1)
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Alicia')
  })

  it('does not dispatch event on change in a cell (deep change)', () => {
    const df = arrayDataFrame(testData)
    const resolveListener = vi.fn()
    df.eventTarget?.addEventListener('resolve', resolveListener)

    // when a property of an array element (a cell) is changed, no event is dispatched, because the proxy is shallow
    df._array[0].name = 'Alicia'
    expect(resolveListener).toHaveBeenCalledTimes(0)
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Alicia')
  })

  it('does not dispatch event on on row changes on non-proxied array', () => {
    const original = [
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
      { id: 3, name: 'Charlie', age: 35 },
    ]
    const df = arrayDataFrame(original)
    const resolveListener = vi.fn()
    df.eventTarget?.addEventListener('resolve', resolveListener)

    // when the original array is modified, the event is not dispatched, but the data is updated
    original[0] = { id: 1, name: 'Alicia', age: 30 }
    expect(resolveListener).toHaveBeenCalledTimes(0)
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Alicia')
  })

  describe('if rowNumbers is provided', () => {
    it('is used to determine the row numbers', () => {
      const df = arrayDataFrame(testData, [10, 20, 30])
      expect(df.numRows).toBe(3)
      expect(df.getRowNumber({ row: 0 })?.value).toBe(10)
      expect(df.getRowNumber({ row: 1 })?.value).toBe(20)
      expect(df.getRowNumber({ row: 2 })?.value).toBe(30)
      expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Alice')
      expect(() => df.getCell({ row: 10, column: 'name' })).toThrow('Invalid row index: 10')
    })
    it('must be the same length as the data array', () => {
      const df = arrayDataFrame(testData, [10, 20, 30])
      expect(df.getRowNumber({ row: 2 })?.value).toBe(30)
      df._array.push({ id: 4, name: 'Diana', age: 28 })
      expect(() => df.getRowNumber({ row: 3 })).toThrow('rowNumbers are provided, but row number not found for row 3.')
      df._rowNumbers?.push(40)
      expect(df.getRowNumber({ row: 3 })?.value).toBe(40)
    })
    it('must throw if row number is invalid', () => {
      const df = arrayDataFrame(testData, [NaN, -5, 1.5])
      expect(() => df.getRowNumber({ row: 0 })).toThrow('Invalid row number: NaN for row 0')
      expect(() => df.getRowNumber({ row: 1 })).toThrow('Invalid row number: -5 for row 1')
      expect(() => df.getRowNumber({ row: 2 })).toThrow('Invalid row number: 1.5 for row 2')
    })
  })
})
