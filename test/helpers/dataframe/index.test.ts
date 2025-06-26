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

})

describe('sortableDataFrame', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ]
  const dataFrame = arrayDataFrame(data)

  it('should set sortable to true', () => {
    const df = sortableDataFrame(dataFrame)
    expect(df.sortable).toBe(true)
  })

  it('should preserve header and numRows', () => {
    const df = sortableDataFrame(dataFrame)
    expect(df.header).toEqual(dataFrame.header)
    expect(df.numRows).toBe(dataFrame.numRows)
  })

  it('should return unsorted data when orderBy is not provided', () => {
    const df = sortableDataFrame(dataFrame)
    expect(df.getCell({ row: 0, column: 'name' })?.value).toBe('Charlie')
    expect(df.getCell({ row: 1, column: 'name' })?.value).toBe('Alice')
    expect(df.getCell({ row: 2, column: 'name' })?.value).toBe('Bob')
  })

  it('should return unsorted data when orderBy is an empty array', () => {
    const df = sortableDataFrame(dataFrame)
    expect(df.getCell({ row: 0, column: 'name', orderBy: [] })?.value).toBe('Charlie')
    expect(df.getCell({ row: 1, column: 'name', orderBy: [] })?.value).toBe('Alice')
    expect(df.getCell({ row: 2, column: 'name', orderBy: [] })?.value).toBe('Bob')
  })

  it('should return data sorted by column "age" in ascending order', async () => {
    const df = sortableDataFrame(dataFrame)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should return data sorted by column "age" in descending order, using the data index in case of ties', async () => {
    const df = sortableDataFrame(dataFrame)
    const orderBy = [{ column: 'age', direction: 'descending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Alice')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Dani')
  })

  it('should return data sorted by columns "age" in ascending order and "name" in descending order', async () => {
    const df = sortableDataFrame(dataFrame)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }, { column: 'name', direction: 'descending' as const }]
    await df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Dani')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
    expect(df.getCell({ row: 3, column: 'name', orderBy })?.value).toBe('Alice')
  })

  it('should throw for invalid orderBy field', async () => {
    const df = sortableDataFrame(dataFrame)
    const orderBy = [{ column: 'invalid', direction: 'ascending' as const }]
    await expect(df.fetch({ orderBy, rowStart: 0, rowEnd: 4, columns: ['name'] })).rejects.toThrow('Invalid orderBy field: invalid')
  })
})

// TODO(SL!): restore rowCache tests
// ---

// import { describe, expect, it, vi } from 'vitest'
// import { AsyncRow, awaitRows } from '../../src/helpers/row.js'
// import { rowCache } from '../../src/helpers/rowCache.js'
// import { wrapResolved } from '../../src/utils/promise.js'

// // Mock DataFrame
// function makeDf() {
//   return {
//     header: ['id'],
//     numRows: 10,
//     rows: vi.fn(({ start, end }: {start: number, end: number}): AsyncRow[] =>
//       new Array(end - start)
//         .fill(null)
//         .map((_, index) => ({
//           index: wrapResolved(start + index),
//           cells: {
//             id: wrapResolved(start + index),
//           },
//         }))
//     ),
//   }
// }

// describe('rowCache', () => {
//   it('should fetch uncached rows', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)
//     const rows = await awaitRows(dfCached.rows({ start: 0, end: 3 }))
//     expect(rows).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }].map((cells, index) => ({ cells, index })))
//     expect(df.rows).toHaveBeenCalledTimes(1)
//     expect(df.rows).toHaveBeenCalledWith({ start: 0, end: 3 })
//   })

//   it('should return cached rows', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)

//     // Initial fetch to cache rows
//     const rowsPre = await awaitRows(dfCached.rows({ start: 3, end: 6 }))
//     expect(rowsPre).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(1)
//     expect(df.rows).toHaveBeenCalledWith({ start: 3, end: 6 })

//     // Subsequent fetch should use cache
//     const rowsPost = await awaitRows(dfCached.rows({ start: 3, end: 6 }))
//     expect(rowsPost).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(1)
//   })

//   it('should cache rows for each orderBy combination', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)

//     const orderBy1 = [{ column: 'id', direction: 'ascending' as const }]
//     const orderBy2 = [{ column: 'id', direction: 'descending' as const }]
//     const orderBy3 = [{ column: 'id', direction: 'ascending' as const }, { column: 'id', direction: 'descending' as const }]

//     // Initial fetch to cache rows
//     const rowsPre1 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy1 }))
//     expect(rowsPre1).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(1)

//     // Subsequent fetch should use cache
//     const rowsPost1 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy1 }))
//     expect(rowsPost1).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(1)

//     // Subsequent fetch with another orderBy should not use cache
//     const rowsPre2 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy2 }))
//     expect(rowsPre2).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(2)

//     // Subsequent fetch with a third orderBy should not use cache
//     const rowsPre3 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy3 }))
//     expect(rowsPre3).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(3)

//     // Subsequent fetch with the second orderBy should use cache
//     const rowsPost2 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy2 }))
//     expect(rowsPost2).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(3)

//     // Subsequent fetch with the third orderBy should not cache
//     const rowsPost3 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy3 }))
//     expect(rowsPost3).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
//     expect(df.rows).toHaveBeenCalledTimes(3)
//   })

//   it('should handle adjacent cached blocks', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)

//     // Cache first block
//     dfCached.rows({ start: 0, end: 3 })
//     expect(df.rows).toHaveBeenCalledTimes(1)
//     // Cache adjacent block
//     dfCached.rows({ start: 3, end: 6 })
//     expect(df.rows).toHaveBeenCalledTimes(2)
//     // Fetch combined block
//     const adjacentRows = await awaitRows(dfCached.rows({ start: 0, end: 6 }))

//     expect(adjacentRows).toEqual([
//       { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
//     ].map((cells, index) => ({ cells, index })))
//     expect(df.rows).toHaveBeenCalledTimes(2)
//   })

//   it('should handle a gap in cached blocks', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)

//     // Cache first block
//     dfCached.rows({ start: 0, end: 2 })
//     // Cache second block
//     dfCached.rows({ start: 4, end: 6 })
//     // Fetch combined block
//     const gapRows = await awaitRows(dfCached.rows({ start: 0, end: 6 }))
//     expect(gapRows).toEqual([
//       { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
//     ].map((cells, index) => ({ cells, index })))
//     expect(df.rows).toHaveBeenCalledTimes(3)
//     expect(df.rows).toHaveBeenCalledWith({ start: 2, end: 4 })
//   })

//   it('should handle overlapping cached blocks', async () => {
//     const df = makeDf()
//     const dfCached = rowCache(df)

//     // Cache first block
//     dfCached.rows({ start: 6, end: 9 })

//     // Fetch overlapping block
//     const overlappingRows = await awaitRows(dfCached.rows({ start: 8, end: 11 }))
//     expect(overlappingRows).toEqual([
//       { id: 8 }, { id: 9 }, { id: 10 },
//     ].map((cells, index) => ({ cells, index: index + 8 })))
//     expect(df.rows).toHaveBeenCalledTimes(2)
//     expect(df.rows).toHaveBeenCalledWith({ start: 9, end: 11 })
//   })
// })
