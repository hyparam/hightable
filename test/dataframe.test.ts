import { describe, expect, it } from 'vitest'
import { DataFrame, Row, awaitRows, resolvablePromise, sortableDataFrame, wrapPromise } from '../src/dataframe.js'

function wrapObject(obj: Record<string, any>): Row {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, wrapPromise(value)])
  )
}

describe('resolvablePromise', () => {
  it('should resolve with a value', async () => {
    const promise = resolvablePromise<number>()
    promise.resolve(42)
    expect(await promise).toBe(42)
  })
  it('should reject with an error', async () => {
    const promise = resolvablePromise<number>()
    promise.reject(new Error('Failed'))
    await expect(promise).rejects.toThrow('Failed')
  })
})

describe('awaitRows', () => {
  it('should resolve with a row', async () => {
    const row = wrapObject({ id: 1, name: 'Alice', age: 30, __index__: 0 })
    const result = await awaitRows([row])
    expect(result).toEqual([{ id: 1, name: 'Alice', age: 30, __index__: 0 }])
  })
})

describe('sortableDataFrame', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ]

  const dataFrame: DataFrame = {
    header: ['id', 'name', 'age'],
    numRows: data.length,
    rows(start: number, end: number): Row[] {
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
    ])
  })

  it('should return data sorted by column "age"', async () => {
    const rows = await awaitRows(sortableDf.rows(0, 4, 'age'))
    expect(rows).toEqual([
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 4, name: 'Dani', age: 20, __index__: 3 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
      { id: 1, name: 'Alice', age: 30, __index__: 1 },
    ])
  })

  it('should slice the sorted data correctly', async () => {
    const rows = await awaitRows(sortableDf.rows(1, 3, 'id'))
    expect(rows).toEqual([
      { id: 2, name: 'Bob', age: 20, __index__: 2 },
      { id: 3, name: 'Charlie', age: 25, __index__: 0 },
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
