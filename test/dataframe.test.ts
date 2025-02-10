import { describe, expect, it } from 'vitest'
import { AsyncRow, DataFrame, Row, arrayDataFrame, awaitRows, sortableDataFrame } from '../src/dataframe.js'
import { wrapPromise } from '../src/promise.js'

export function wrapObject({ index, cells }: Row): AsyncRow {
  return {
    index: wrapPromise(index),
    cells: Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])
    ),
  }
}

describe('awaitRows', () => {
  it('should resolve with a row', async () => {
    const row = wrapObject({ cells: { id: 1, name: 'Alice', age: 30 }, index: 0 })
    const result = await awaitRows([row])
    expect(result).toEqual([{ cells: { id: 1, name: 'Alice', age: 30 }, index: 0 }])
  })
})

describe('sortableDataFrame', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ].map((cells, index) => ({ cells, index }))

  const dataFrame: DataFrame = {
    header: ['id', 'name', 'age'],
    numRows: data.length,
    rows(start: number, end: number): AsyncRow[] {
      // Return the slice of data between start and end indices
      return data.slice(start, end).map(wrapObject)
    },
    sortable: false,
  }

  const sortableDf = sortableDataFrame(dataFrame)

  it('should set sortable to true', () => {
    expect(sortableDf.sortable).toBe(true)
  })

  it('should preserve header and numRows', () => {
    expect(sortableDf.header).toEqual(dataFrame.header)
    expect(sortableDf.numRows).toBe(dataFrame.numRows)
  })

  it('should return unsorted data when orderBy is not provided', async () => {
    const rows = await awaitRows(sortableDf.rows(0, 3))
    expect(rows).toEqual([
      { id: 3, name: 'Charlie', age: 25 },
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 20 },
    ].map((cells, index) => ({ cells, index })))
  })

  it('should return data sorted by column "age"', async () => {
    const rows = await awaitRows(sortableDf.rows(0, 4, 'age'))
    expect(rows).toEqual([
      { index: 2, cells:{ id: 2, name: 'Bob', age: 20 } },
      { index: 3, cells:{ id: 4, name: 'Dani', age: 20 } },
      { index: 0, cells:{ id: 3, name: 'Charlie', age: 25 } },
      { index: 1, cells:{ id: 1, name: 'Alice', age: 30 } },
    ])
  })

  it('should slice the sorted data correctly', async () => {
    const rows = await awaitRows(sortableDf.rows(1, 3, 'id'))
    expect(rows).toEqual([
      { index: 2, cells:{ id: 2, name: 'Bob', age: 20 } },
      { index: 0, cells:{ id: 3, name: 'Charlie', age: 25 } },
    ])
  })

  it('returns self if already sortable', () => {
    const sortableDf2 = sortableDataFrame(sortableDf)
    expect(sortableDf2).toBe(sortableDf)
  })

  it('should throw for invalid orderBy field', () => {
    expect(() => sortableDf.rows(0, 3, 'invalid'))
      .toThrowError('Invalid orderBy field: invalid')
  })
})

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

  it('should handle empty data array', async () => {
    const df = arrayDataFrame([])
    expect(df.header).toEqual([])
    expect(df.numRows).toBe(0)
    await expect(awaitRows(df.rows(0, 1))).resolves.toEqual([])
  })

  it('should return correct rows for given range', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows(0, 2))
    expect(rows).toEqual([
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
    ].map((cells, index) => ({ cells, index })))
  })

  it('should handle start index equal to end index', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows(1, 1))
    expect(rows).toEqual([])
  })

  it('should return all rows when end index exceeds array length', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows(0, 10))
    expect(rows).toEqual(testData.map((cells, index) => ({ cells, index })))
  })
})
