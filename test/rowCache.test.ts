import { describe, expect, it, vi } from 'vitest'
import { RowsArgs } from '../src/dataframe.js'
import { wrapPromise } from '../src/promise.js'
import { AsyncRow, awaitRows } from '../src/row.js'
import { rowCache } from '../src/rowCache.js'

// Mock DataFrame
function makeDf() {
  return {
    header: ['id'],
    numRows: 10,
    rows: vi.fn(({ start, end }: RowsArgs): AsyncRow[] =>
      new Array(end - start)
        .fill(null)
        .map((_, index) => ({
          index: wrapPromise(start + index),
          cells: {
            id: wrapPromise(start + index),
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
