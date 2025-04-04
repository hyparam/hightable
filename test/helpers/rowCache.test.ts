import { describe, expect, it, vi } from 'vitest'
import { AsyncRow, awaitRows } from '../../src/helpers/row.js'
import { rowCache } from '../../src/helpers/rowCache.js'
import { wrapResolved } from '../../src/utils/promise.js'

// Mock DataFrame
function makeDf() {
  return {
    header: ['id'],
    numRows: 10,
    rows: vi.fn(({ start, end }: {start: number, end: number}): AsyncRow[] =>
      new Array(end - start)
        .fill(null)
        .map((_, index) => ({
          index: wrapResolved(start + index),
          cells: {
            id: wrapResolved(start + index),
          },
        }))
    ),
  }
}

describe('rowCache', () => {
  it('should fetch uncached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)
    const rows = await awaitRows(dfCached.rows({ start: 0, end: 3 }))
    expect(rows).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }].map((cells, index) => ({ cells, index })))
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith({ start: 0, end: 3 })
  })

  it('should return cached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Initial fetch to cache rows
    const rowsPre = await awaitRows(dfCached.rows({ start: 3, end: 6 }))
    expect(rowsPre).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith({ start: 3, end: 6 })

    // Subsequent fetch should use cache
    const rowsPost = await awaitRows(dfCached.rows({ start: 3, end: 6 }))
    expect(rowsPost).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(1)
  })

  it('should cache rows for each orderBy combination', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    const orderBy1 = [{ column: 'id', direction: 'ascending' as const }]
    const orderBy2 = [{ column: 'id', direction: 'descending' as const }]
    const orderBy3 = [{ column: 'id', direction: 'ascending' as const }, { column: 'id', direction: 'descending' as const }]

    // Initial fetch to cache rows
    const rowsPre1 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy1 }))
    expect(rowsPre1).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(1)

    // Subsequent fetch should use cache
    const rowsPost1 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy1 }))
    expect(rowsPost1).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(1)

    // Subsequent fetch with another orderBy should not use cache
    const rowsPre2 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy2 }))
    expect(rowsPre2).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(2)

    // Subsequent fetch with a third orderBy should not use cache
    const rowsPre3 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy3 }))
    expect(rowsPre3).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(3)

    // Subsequent fetch with the second orderBy should use cache
    const rowsPost2 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy2 }))
    expect(rowsPost2).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(3)

    // Subsequent fetch with the third orderBy should not cache
    const rowsPost3 = await awaitRows(dfCached.rows({ start: 3, end: 6, orderBy: orderBy3 }))
    expect(rowsPost3).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }].map((cells, index) => ({ cells, index: index + 3 })))
    expect(df.rows).toHaveBeenCalledTimes(3)
  })

  it('should handle adjacent cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows({ start: 0, end: 3 })
    expect(df.rows).toHaveBeenCalledTimes(1)
    // Cache adjacent block
    dfCached.rows({ start: 3, end: 6 })
    expect(df.rows).toHaveBeenCalledTimes(2)
    // Fetch combined block
    const adjacentRows = await awaitRows(dfCached.rows({ start: 0, end: 6 }))

    expect(adjacentRows).toEqual([
      { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
    ].map((cells, index) => ({ cells, index })))
    expect(df.rows).toHaveBeenCalledTimes(2)
  })

  it('should handle a gap in cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows({ start: 0, end: 2 })
    // Cache second block
    dfCached.rows({ start: 4, end: 6 })
    // Fetch combined block
    const gapRows = await awaitRows(dfCached.rows({ start: 0, end: 6 }))
    expect(gapRows).toEqual([
      { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 },
    ].map((cells, index) => ({ cells, index })))
    expect(df.rows).toHaveBeenCalledTimes(3)
    expect(df.rows).toHaveBeenCalledWith({ start: 2, end: 4 })
  })

  it('should handle overlapping cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows({ start: 6, end: 9 })

    // Fetch overlapping block
    const overlappingRows = await awaitRows(dfCached.rows({ start: 8, end: 11 }))
    expect(overlappingRows).toEqual([
      { id: 8 }, { id: 9 }, { id: 10 },
    ].map((cells, index) => ({ cells, index: index + 8 })))
    expect(df.rows).toHaveBeenCalledTimes(2)
    expect(df.rows).toHaveBeenCalledWith({ start: 9, end: 11 })
  })
})
