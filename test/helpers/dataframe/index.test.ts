import { describe, expect, it } from 'vitest'
import { arrayDataFrame, filterDataFrame, sortableDataFrame } from '../../../src/helpers/dataframe/index.js'

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

  it('should set sortable to true to all columns', () => {
    const df = sortableDataFrame(data)
    expect(df.columnDescriptors.every(({ sortable }) => sortable)).toBe(true)
  })

  it('should preserve column names and numRows', () => {
    const df = sortableDataFrame(data)
    expect(df.columnDescriptors.map(({ name }) => name)).toEqual(data.columnDescriptors.map(({ name }) => name))
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
    await df.fetch?.({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should return data sorted by column "age" in descending order, using the data index in case of ties', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'descending' as const }]
    await df.fetch?.({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Alice')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Dani')
  })

  it('should return data sorted by columns "age" in ascending order and "name" in descending order', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }, { column: 'name', direction: 'descending' as const }]
    await df.fetch?.({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should throw for invalid orderBy field', async () => {
    const df = sortableDataFrame(data)
    const orderBy = [{ column: 'invalid', direction: 'ascending' as const }]
    await expect(df.fetch?.({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })).rejects.toThrow('Unsortable columns in orderBy field: invalid')
  })
})

describe('filtered data', () => {
  function createDataFrame() {
    const array = [
      { id: 3, name: 'Charlie', age: 25 },
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 20 },
      { id: 4, name: 'Dani', age: 20 },
    ]
    return arrayDataFrame(array)
  }
  function createSampledDataFrame() {
    const data = createDataFrame()
    const sampledRows = [1, 3]
    return sortableDataFrame(filterDataFrame({ data, filter: ({ row }) => sampledRows.includes(row) }))
  }

  it('should return row numbers of the underlying data', () => {
    const df = createSampledDataFrame()
    expect(df.getRowNumber({ row: 0 })?.value).toBe(1) // Alice
    expect(df.getRowNumber({ row: 1 })?.value).toBe(3) // Dani
  })
  it('should return the correct cell values', () => {
    const df = createSampledDataFrame()
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Alice')
    expect(df.getCell({ row: 1, column: 'name' })?.value).toBe('Dani')
  })
  it('should return ordered data when sorted', async () => {
    const df = createSampledDataFrame()
    const orderBy = [{ column: 'name', direction: 'descending' as const }]
    await df.fetch?.({ orderBy, rowStart: 0, rowEnd: 2, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Alice')
  })
  it('should support two filters', () => {
    const df = filterDataFrame({ data: createSampledDataFrame(), filter: ({ row }) => row === 1 })
    expect(df.numRows).toBe(1)
    expect(df.getRowNumber({ row: 0 })?.value).toBe(3) // Dani
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Dani')
  })
})
