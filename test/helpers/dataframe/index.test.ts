import { describe, expect, it } from 'vitest'
import { arrayDataFrame, sortableDataFrame } from '../../../src/helpers/dataframe/index.js'

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

  it('provides fetch', () => {
    const df = arrayDataFrame([])
    expect(df.fetch).toBeDefined()
  })

  it('does not provide an event target', () => {
    const df = arrayDataFrame([])
    expect(df.eventTarget).toBeUndefined()
  })

})

describe('sortableDataFrame', () => {
  const array = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ]
  const data = arrayDataFrame(array)

  it('should set sortable to true', () => {
    const df = sortableDataFrame(data)
    expect(df.sortable).toBe(true)
  })

  it('should preserve header and numRows', () => {
    const df = sortableDataFrame(data)
    expect(df.header).toEqual(data.header)
    expect(df.numRows).toBe(data.numRows)
  })

  it('should return unsorted data when orderBy is not provided', () => {
    const df = sortableDataFrame(data)
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Charlie')
    expect(df.getCell({ row: 1, column: 'name' })?.value).toBe('Alice')
    expect(df.getCell({ row: 2, column: 'name' })?.value).toBe('Bob')
  })

  it('should return unsorted data when orderBy is an empty array', () => {
    const df = sortableDataFrame(data)
    expect(df.getCell({ row: 0, column: 'name', orderBy: [] })?.value).toBe('Charlie')
    expect(df.getCell({ row: 1, column: 'name', orderBy: [] })?.value).toBe('Alice')
    expect(df.getCell({ row: 2, column: 'name', orderBy: [] })?.value).toBe('Bob')
  })

  it('should return data sorted by column "age" in ascending order', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should return data sorted by column "age" in descending order, using the data index in case of ties', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'descending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Alice')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Dani')
  })

  it('should return data sorted by columns "age" in ascending order and "name" in descending order', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }, { column: 'name', direction: 'descending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should throw for invalid orderBy field', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'invalid', direction: 'ascending' as const }]
    await expect(df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })).rejects.toThrow('Invalid orderBy field: invalid')
  })
})
