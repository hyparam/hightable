import { describe, expect, it, vi } from 'vitest'
import { AsyncRow, awaitRows } from '../src/dataframe.js'
import { rowCache } from '../src/rowCache.js'
import { wrapObject } from './dataframe.test.js'

// Mock DataFrame
function makeDf() {
  return {
    header: ['id'],
    numRows: 10,
    rows: vi.fn((start: number, end: number): AsyncRow[] => {
      return new Array(end - start).fill(null)
        .map((_, index) => wrapObject({
          __index__: start + index,
        }))
    }),
  }
}

describe('rowCache', () => {
  it('should fetch uncached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)
    const rows = await awaitRows(dfCached.rows(0, 3))
    expect(rows).toEqual([{ __index__: 0 }, { __index__: 1 }, { __index__: 2 }])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(0, 3, undefined)
  })

  it('should return cached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Initial fetch to cache rows
    const rowsPre = await awaitRows(dfCached.rows(3, 6))
    expect(rowsPre).toEqual([{ __index__: 3 }, { __index__: 4 }, { __index__: 5 }])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(3, 6, undefined)

    // Subsequent fetch should use cache
    const rowsPost = await awaitRows(dfCached.rows(3, 6))
    expect(rowsPost).toEqual([{ __index__: 3 }, { __index__: 4 }, { __index__: 5 }])
    expect(df.rows).toHaveBeenCalledTimes(1)
  })

  it('should handle adjacent cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows(0, 3)
    expect(df.rows).toHaveBeenCalledTimes(1)
    // Cache adjacent block
    dfCached.rows(3, 6)
    expect(df.rows).toHaveBeenCalledTimes(2)
    // Fetch combined block
    const adjacentRows = await awaitRows(dfCached.rows(0, 6))

    expect(adjacentRows).toEqual([
      { __index__: 0 }, { __index__: 1 }, { __index__: 2 }, { __index__: 3 }, { __index__: 4 }, { __index__: 5 },
    ])
    expect(df.rows).toHaveBeenCalledTimes(2)
  })

  it('should handle a gap in cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows(0, 2)
    // Cache second block
    dfCached.rows(4, 6)
    // Fetch combined block
    const gapRows = await awaitRows(dfCached.rows(0, 6))
    expect(gapRows).toEqual([
      { __index__: 0 }, { __index__: 1 }, { __index__: 2 }, { __index__: 3 }, { __index__: 4 }, { __index__: 5 },
    ])
    expect(df.rows).toHaveBeenCalledTimes(3)
    expect(df.rows).toHaveBeenCalledWith(2, 4, undefined)
  })

  it('should handle overlapping cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    dfCached.rows(6, 9)

    // Fetch overlapping block
    const overlappingRows = await awaitRows(dfCached.rows(8, 11))
    expect(overlappingRows).toEqual([
      { __index__: 8 }, { __index__: 9 }, { __index__: 10 },
    ])
    expect(df.rows).toHaveBeenCalledTimes(2)
    expect(df.rows).toHaveBeenCalledWith(9, 11, undefined)
  })
})
