import { describe, expect, it } from 'vitest'
import { arrayDataFrame } from '../../src/helpers/dataframeV2.js'

describe('arrayDataFrame', () => {
  const testData = [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: 'Charlie', age: 35 },
  ]

  it('should create a DataFrame with correct header and numRows', () => {
    const df = arrayDataFrame(testData)
    expect(df.header).toEqual(['id', 'name', 'age'])
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
    expect(df.header).toEqual([])
    expect(df.numRows).toBe(0)
    expect(() => {
      df.getCell({ row: 0, column: 'name' } )
    }).toThrow('Invalid row index: 0')
  })

  it('provides fetch, even if it\'s a no-op function', () => {
    const df = arrayDataFrame([])
    expect(df.fetch).toBeDefined()
  })

})
