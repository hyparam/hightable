import { describe, expect, it } from 'vitest'
import { arrayDataFrame } from '../../../src/helpers/dataframe/index.js'

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

  it('does not provides fetch', () => {
    const df = arrayDataFrame([])
    expect(df.fetch).toBeUndefined()
  })

})

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

// ---

// import { describe, expect, it } from 'vitest'
// import { AsyncRow, Row, asyncRows, awaitRows } from '../../src/helpers/row.js'
// import { wrapResolved } from '../../src/utils/promise.js'

// export function wrapObject({ index, cells }: Row): AsyncRow {
//   return {
//     index: wrapResolved(index),
//     cells: Object.fromEntries(
//       Object.entries(cells).map(([key, value]) => [key, wrapResolved(value)])
//     ),
//   }
// }

// describe('awaitRows', () => {
//   it('should resolve with a row', async () => {
//     const row = wrapObject({ cells: { id: 1, name: 'Alice', age: 30 }, index: 0 })
//     const result = await awaitRows([row])
//     expect(result).toEqual([{ cells: { id: 1, name: 'Alice', age: 30 }, index: 0 }])
//   })
// })

// describe('asyncRows', () => {
//   it('resolves rows with simple values', async () => {
//     const rows: Row[] = [
//       { index: 0, cells: { id: 1, name: 'Alice' } },
//       { index: 1, cells: { id: 2, name: 'Bob' } },
//     ]
//     const asyncRowsResult = asyncRows(Promise.resolve(rows), rows.length, ['id', 'name'])
//     const resolved = await awaitRows(asyncRowsResult)
//     expect(resolved).toEqual(rows)
//   })

//   it('handles cell and index promises', async () => {
//     const rows = [
//       { index: Promise.resolve(0), cells: { id: Promise.resolve(3) } },
//     ]
//     const asyncRowsResult = asyncRows(Promise.resolve(rows), 1, ['id'])
//     const resolved = await awaitRows(asyncRowsResult)
//     expect(resolved).toEqual([{ index: 0, cells: { id: 3 } }])
//   })

//   it('rejects when the promise rejects', async () => {
//     const error = new Error('boom')
//     const asyncRowsResult = asyncRows(Promise.reject(error), 1, ['id'])
//     await expect(awaitRows(asyncRowsResult)).rejects.toThrow(error)
//   })
// })

// ---

// import { describe, expect, it } from 'vitest'
// import { DataFrame, arrayDataFrame, getGetColumn, getRanks, sortableDataFrame } from '../../src/helpers/dataframe.js'
// import { AsyncRow, Row, awaitRows } from '../../src/helpers/row.js'
// import { wrapResolved } from '../../src/utils/promise.js'

// export function wrapObject({ index, cells }: Row): AsyncRow {
//   return {
//     index: wrapResolved(index),
//     cells: Object.fromEntries(
//       Object.entries(cells).map(([key, value]) => [key, wrapResolved(value)])
//     ),
//   }
// }

// describe('getGetColumn', () => {
//   const data = [
//     { id: 3, name: 'Charlie', age: 25 },
//     { id: 1, name: 'Alice', age: 30 },
//     { id: 2, name: 'Bob', age: 20 },
//     { id: 4, name: 'Dani', age: 20 },
//   ].map((cells, index) => ({ cells, index }))

//   const dataFrame: DataFrame = {
//     header: ['id', 'name', 'age'],
//     numRows: data.length,
//     rows({ start, end }): AsyncRow[] {
//       // Return the slice of data between start and end indices
//       return data.slice(start, end).map(wrapObject)
//     },
//   }
//   const getColumn = getGetColumn(dataFrame)

//   it('should return the dataframe getColumn function if it exists', () => {
//     const df = {
//       header: ['id', 'name', 'age'],
//       numRows: 3,
//       rows: () => [],
//       getColumn: () => Promise.resolve(['Alice', 'Bob', 'Charlie']),
//     }
//     expect(getGetColumn(df)).toBe(df.getColumn)
//   })

//   it('should return a function that throws if getColumn is not defined', () => {
//     expect(() => getColumn({ column: 'invalid' })).toThrowError('Invalid column: invalid')
//   })

//   it('should return a function that returns the correct column data', async () => {
//     const column = await getColumn({ column: 'name' })
//     expect(column).toEqual(['Charlie', 'Alice', 'Bob', 'Dani'])
//   })

//   it.each([ [0, 2], [0, -2], [-4, 2], [0.1, 2.8] ])('should return correct column data for given range', async (start, end) => {
//     const column = await getColumn({ column: 'name', start, end })
//     expect(column).toEqual(['Charlie', 'Alice'])
//   })

//   it.each([ [10, 20], [0, 0], [2, 1], [data.length, 20] ])('should handle start and end index out of bounds', async (start, end) => {
//     const values = await getColumn({ start, end, column: 'name' })
//     expect(values).toEqual([])
//   })

// })

// describe('getRanks', () => {
//   const data = [
//     { id: 3, name: 'Charlie', age: 25 },
//     { id: 1, name: 'Alice', age: 30 },
//     { id: 2, name: 'Bob', age: 20 },
//     { id: 4, name: 'Dani', age: 20 },
//   ].map((cells, index) => ({ cells, index }))

//   const dataFrame: DataFrame = {
//     header: ['id', 'name', 'age'],
//     numRows: data.length,
//     rows({ start, end }): AsyncRow[] {
//       // Return the slice of data between start and end indices
//       return data.slice(start, end).map(wrapObject)
//     },
//     sortable: false,
//   }

//   it('should return different indexes when all the values are different', async () => {
//     const ranks = await getRanks({ data: dataFrame, column: 'id' })
//     expect(ranks).toEqual([2, 0, 1, 3])
//   })

//   it('should return equal indexes when the values are the same', async () => {
//     const ranks = await getRanks({ data: dataFrame, column: 'age' })
//     expect(ranks).toEqual([2, 3, 0, 0])
//   })
// })

// describe('sortableDataFrame', () => {
//   const data = [
//     { id: 3, name: 'Charlie', age: 25 },
//     { id: 1, name: 'Alice', age: 30 },
//     { id: 2, name: 'Bob', age: 20 },
//     { id: 4, name: 'Dani', age: 20 },
//   ].map((cells, index) => ({ cells, index }))

//   const dataFrame: DataFrame = {
//     header: ['id', 'name', 'age'],
//     numRows: data.length,
//     rows({ start, end }): AsyncRow[] {
//       // Return the slice of data between start and end indices
//       return data.slice(start, end).map(wrapObject)
//     },
//     sortable: false,
//   }

//   const sortableDf = sortableDataFrame(dataFrame)

//   it('should set sortable to true', () => {
//     expect(sortableDf.sortable).toBe(true)
//   })

//   it('should preserve header and numRows', () => {
//     expect(sortableDf.header).toEqual(dataFrame.header)
//     expect(sortableDf.numRows).toBe(dataFrame.numRows)
//   })

//   it('should return unsorted data when orderBy is not provided', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 0, end: 3 }))
//     expect(rows).toEqual([
//       { id: 3, name: 'Charlie', age: 25 },
//       { id: 1, name: 'Alice', age: 30 },
//       { id: 2, name: 'Bob', age: 20 },
//     ].map((cells, index) => ({ cells, index })))
//   })

//   it('should return unsorted data when orderBy is an empty array', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 0, end: 3, orderBy: [] }))
//     expect(rows).toEqual([
//       { id: 3, name: 'Charlie', age: 25 },
//       { id: 1, name: 'Alice', age: 30 },
//       { id: 2, name: 'Bob', age: 20 },
//     ].map((cells, index) => ({ cells, index })))
//   })

//   it('should return data sorted by column "age" in ascending order', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 0, end: 4, orderBy: [{ column: 'age', direction: 'ascending' as const }] }))
//     expect(rows).toEqual([
//       { index: 2, cells: { id: 2, name: 'Bob', age: 20 } },
//       { index: 3, cells: { id: 4, name: 'Dani', age: 20 } },
//       { index: 0, cells: { id: 3, name: 'Charlie', age: 25 } },
//       { index: 1, cells: { id: 1, name: 'Alice', age: 30 } },
//     ])
//   })

//   it('should return data sorted by column "age" in descending order, using the data index in case of ties', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 0, end: 4, orderBy: [{ column: 'age', direction: 'descending' as const }] }))
//     expect(rows).toEqual([
//       { index: 1, cells: { id: 1, name: 'Alice', age: 30 } },
//       { index: 0, cells: { id: 3, name: 'Charlie', age: 25 } },
//       { index: 2, cells: { id: 2, name: 'Bob', age: 20 } },
//       { index: 3, cells: { id: 4, name: 'Dani', age: 20 } },
//     ])
//   })

//   it('should return data sorted by columns "age" in ascending order and "name" in descending order', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 0, end: 4, orderBy: [{ column: 'age', direction: 'ascending' as const }, { column: 'name', direction: 'descending' as const }] }))
//     expect(rows).toEqual([
//       { index: 3, cells: { id: 4, name: 'Dani', age: 20 } },
//       { index: 2, cells: { id: 2, name: 'Bob', age: 20 } },
//       { index: 0, cells: { id: 3, name: 'Charlie', age: 25 } },
//       { index: 1, cells: { id: 1, name: 'Alice', age: 30 } },
//     ])
//   })

//   it('should slice the sorted data correctly in ascending order', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 1, end: 3, orderBy: [{ column: 'id', direction: 'ascending' as const }] }))
//     expect(rows).toEqual([
//       { index: 2, cells: { id: 2, name: 'Bob', age: 20 } },
//       { index: 0, cells: { id: 3, name: 'Charlie', age: 25 } },
//     ])
//   })

//   it('should slice the sorted data correctly in descending order', async () => {
//     const rows = await awaitRows(sortableDf.rows({ start: 1, end: 3, orderBy: [{ column: 'id', direction: 'descending' as const }] }))
//     expect(rows).toEqual([
//       { index: 0, cells: { id: 3, name: 'Charlie', age: 25 } },
//       { index: 2, cells: { id: 2, name: 'Bob', age: 20 } },
//     ])
//   })

//   it('returns self if already sortable', () => {
//     const sortableDf2 = sortableDataFrame(sortableDf)
//     expect(sortableDf2).toBe(sortableDf)
//   })

//   it('should throw for invalid orderBy field', () => {
//     expect(() => sortableDf.rows({ start: 0, end: 3, orderBy: [{ column: 'invalid', direction: 'ascending' as const }] }))
//       .toThrowError('Invalid orderBy field: invalid')
//   })
// })

// describe('arrayDataFrame', () => {
//   const testData = [
//     { id: 1, name: 'Alice', age: 30 },
//     { id: 2, name: 'Bob', age: 25 },
//     { id: 3, name: 'Charlie', age: 35 },
//   ]

//   it('should create a DataFrame with correct header and numRows', () => {
//     const df = arrayDataFrame(testData)
//     expect(df.header).toEqual(['id', 'name', 'age'])
//     expect(df.numRows).toBe(3)
//   })

//   it('should handle empty data array', async () => {
//     const df = arrayDataFrame([])
//     expect(df.header).toEqual([])
//     expect(df.numRows).toBe(0)
//     await expect(awaitRows(df.rows({ start: 0, end: 1 }))).resolves.toEqual([])
//   })

//   it('should return correct rows for given range', async () => {
//     const df = arrayDataFrame(testData)
//     const rows = await awaitRows(df.rows({ start: 0, end: 2 }))
//     expect(rows).toEqual([
//       { id: 1, name: 'Alice', age: 30 },
//       { id: 2, name: 'Bob', age: 25 },
//     ].map((cells, index) => ({ cells, index })))
//   })

//   it('should handle start index equal to end index', async () => {
//     const df = arrayDataFrame(testData)
//     const rows = await awaitRows(df.rows({ start: 1, end: 1 }))
//     expect(rows).toEqual([])
//   })

//   it('should return all rows when end index exceeds array length', async () => {
//     const df = arrayDataFrame(testData)
//     const rows = await awaitRows(df.rows({ start: 0, end: 10 }))
//     expect(rows).toEqual(testData.map((cells, index) => ({ cells, index })))
//   })

//   it('provides getColumn', () => {
//     const df = arrayDataFrame([])
//     expect(df.getColumn).toBeDefined()
//   })

//   it.each([ [0, 2], [0, -2], [-4, 2], [0.1, 2.8], [10, 20], [0, 0], [2, 1], [testData.length, 20] ])('should return the same as getGetColumn', async (start, end) => {
//     const df = arrayDataFrame(testData)
//     if (!df.getColumn) throw new Error('getColumn not defined')
//     const column = await df.getColumn({ column: 'name', start, end })
//     delete df.getColumn
//     const getColumn = getGetColumn(df)
//     const column2 = await getColumn({ column: 'name', start, end })
//     expect(column).toEqual(column2)
//   })

//   it('should throw for invalid column', () => {
//     const df = arrayDataFrame(testData)
//     expect(() => {
//       if (!df.getColumn) {
//         throw new Error('getColumn not defined')
//       }
//       void df.getColumn({ column: 'invalid' })
//     }).toThrowError('Invalid column: invalid')
//   })
// })
