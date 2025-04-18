import { describe, expect, it } from 'vitest'
import { AsyncRow, Row, awaitRows } from '../../src/helpers/row.js'
import { wrapResolved } from '../../src/utils/promise.js'

export function wrapObject({ index, cells }: Row): AsyncRow {
  return {
    index: wrapResolved(index),
    cells: Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, wrapResolved(value)])
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
