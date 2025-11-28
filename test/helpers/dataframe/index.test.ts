import { describe, expect, it } from 'vitest'
import { arrayDataFrame, sortableDataFrame } from '../../../src/helpers/dataframe/index.js'

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
