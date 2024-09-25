import { describe, expect, it } from 'vitest'
import { DataFrame, sortableDataFrame } from '../src/dataframe.js'

describe('sortableDataFrame', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
  ]

  const dataFrame: DataFrame = {
    header: ['id', 'name', 'age'],
    numRows: data.length,
    async rows(start: number, end: number): Promise<Record<string, any>[]> {
      // Return the slice of data between start and end indices
      return data.slice(start, end)
    },
    sortable: false,
  }

  const sortableDF = sortableDataFrame(dataFrame)

  it('should set sortable to true', () => {
    expect(sortableDF.sortable).toBe(true)
  })

  it('should preserve header and numRows', () => {
    expect(sortableDF.header).toEqual(dataFrame.header)
    expect(sortableDF.numRows).toBe(dataFrame.numRows)
  })

  it('should return unsorted data when orderBy is not provided', async () => {
    const rows = await sortableDF.rows(0, 3)
    expect(rows).toEqual([
      { id: 3, name: 'Charlie', age: 25 },
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 20 },
    ])
  })

  it('should return data sorted by "id"', async () => {
    const rows = await sortableDF.rows(0, 3, 'id')
    expect(rows).toEqual([
      { id: 1, name: 'Alice', age: 30, __index__: 1 },
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
    ])
  })

  it('should return data sorted by "name"', async () => {
    const rows = await sortableDF.rows(0, 3, 'name')
    expect(rows).toEqual([
      { id: 1, name: 'Alice', age: 30, __index__: 1 },
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
    ])
  })

  it('should return data sorted by "age"', async () => {
    const rows = await sortableDF.rows(0, 3, 'age')
    expect(rows).toEqual([
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
      { id: 1, name: 'Alice', age: 30, __index__: 1 },
    ])
  })

  it('should slice the sorted data correctly', async () => {
    const rows = await sortableDF.rows(1, 3, 'id')
    expect(rows).toEqual([
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
    ])
  })

  it('should handle invalid "orderBy" field gracefully', async () => {
    const rows = await sortableDF.rows(0, 3, 'unknown')
    expect(rows).toEqual([
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
      { id: 1, name: 'Alice', age: 30, __index__: 1 },
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
    ])
  })
})
