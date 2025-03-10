import { describe, expect, it } from 'vitest'
import { DataFrame, arrayDataFrame, getGetColumn, sortableDataFrame } from '../src/dataframe.js'
import { wrapPromise } from '../src/promise.js'
import { AsyncRow, Row, awaitRows } from '../src/row.js'

export function wrapObject({ index, cells }: Row): AsyncRow {
  return {
    index: wrapPromise(index),
    cells: Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])
    ),
  }
}

describe('getGetColumn', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ].map((cells, index) => ({ cells, index }))

  const dataFrame: DataFrame = {
    header: ['id', 'name', 'age'],
    numRows: data.length,
    rows({ start, end }): AsyncRow[] {
      // Return the slice of data between start and end indices
      return data.slice(start, end).map(wrapObject)
    },
  }
  const getColumn = getGetColumn(dataFrame)

  it('should return the dataframe getColumn function if it exists', () => {
    const df = {
      header: ['id', 'name', 'age'],
      numRows: 3,
      rows: () => [],
      getColumn: () => Promise.resolve(['Alice', 'Bob', 'Charlie']),
    }
    expect(getGetColumn(df)).toBe(df.getColumn)
  })

  it('should return a function that throws if getColumn is not defined', () => {
    expect(() => getColumn({ column: 'invalid' })).toThrowError('Invalid column: invalid')
  })

  it('should return a function that returns the correct column data', async () => {
    const column = await getColumn({ column: 'name' })
    expect(column).toEqual(['Charlie', 'Alice', 'Bob', 'Dani'])
  })

  it.each([ [0, 2], [0, -2], [-4, 2], [0.1, 2.8] ])('should return correct column data for given range', async (start, end) => {
    const column = await getColumn({ column: 'name', start, end })
    expect(column).toEqual(['Charlie', 'Alice'])
  })

  it.each([ [10, 20], [0, 0], [2, 1], [data.length, 20] ])('should handle start and end index out of bounds', async (start, end) => {
    const values = await getColumn({ start, end, column: 'name' })
    expect(values).toEqual([])
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
    rows({ start, end }): AsyncRow[] {
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
    const rows = await awaitRows(sortableDf.rows({ start: 0, end: 3 }))
    expect(rows).toEqual([
      { id: 3, name: 'Charlie', age: 25 },
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 20 },
    ].map((cells, index) => ({ cells, index })))
  })

  it('should return unsorted data when orderBy is an empty array', async () => {
    const rows = await awaitRows(sortableDf.rows({ start: 0, end: 3, orderBy: [] }))
    expect(rows).toEqual([
      { id: 3, name: 'Charlie', age: 25 },
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 20 },
    ].map((cells, index) => ({ cells, index })))
  })

  it('should return data sorted by column "age"', async () => {
    const rows = await awaitRows(sortableDf.rows({ start: 0, end: 4, orderBy: [{ column: 'age' }] }))
    expect(rows).toEqual([
      { index: 2, cells:{ id: 2, name: 'Bob', age: 20 } },
      { index: 3, cells:{ id: 4, name: 'Dani', age: 20 } },
      { index: 0, cells:{ id: 3, name: 'Charlie', age: 25 } },
      { index: 1, cells:{ id: 1, name: 'Alice', age: 30 } },
    ])
  })

  it('should slice the sorted data correctly', async () => {
    const rows = await awaitRows(sortableDf.rows({ start: 1, end: 3, orderBy: [{ column: 'id' }] }))
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
    expect(() => sortableDf.rows({ start: 0, end: 3, orderBy: [{ column: 'invalid' }] }))
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
    await expect(awaitRows(df.rows({ start: 0, end: 1 }))).resolves.toEqual([])
  })

  it('should return correct rows for given range', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows({ start: 0, end: 2 }))
    expect(rows).toEqual([
      { id: 1, name: 'Alice', age: 30 },
      { id: 2, name: 'Bob', age: 25 },
    ].map((cells, index) => ({ cells, index })))
  })

  it('should handle start index equal to end index', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows({ start: 1, end: 1 }))
    expect(rows).toEqual([])
  })

  it('should return all rows when end index exceeds array length', async () => {
    const df = arrayDataFrame(testData)
    const rows = await awaitRows(df.rows({ start: 0, end: 10 }))
    expect(rows).toEqual(testData.map((cells, index) => ({ cells, index })))
  })

  it('provides getColumn', () => {
    const df = arrayDataFrame([])
    expect(df.getColumn).toBeDefined()
  })

  it.each([ [0, 2], [0, -2], [-4, 2], [0.1, 2.8], [10, 20], [0, 0], [2, 1], [testData.length, 20] ])('should return the same as getGetColumn', async (start, end) => {
    const df = arrayDataFrame(testData)
    if (!df.getColumn) throw new Error('getColumn not defined')
    const column = await df.getColumn({ column: 'name', start, end })
    delete df.getColumn
    const getColumn = getGetColumn(df)
    const column2 = await getColumn({ column: 'name', start, end })
    expect(column).toEqual(column2)
  })

  it('should throw for invalid column', () => {
    const df = arrayDataFrame(testData)
    expect(() => {
      if (!df.getColumn) {
        throw new Error('getColumn not defined')
      }
      void df.getColumn({ column: 'invalid' })
    }).toThrowError('Invalid column: invalid')
  })
})
