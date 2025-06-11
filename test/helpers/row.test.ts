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
