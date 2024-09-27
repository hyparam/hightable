import { describe, expect, it, vi } from 'vitest'
import { awaitRows, Row } from '../src/dataframe.js'
import { rowCache } from '../src/rowCache.js'

// Mock DataFrame
function makeDf() {
  return {
    header: ['id'],
    numRows: 10,
    rows: vi.fn((start: number, end: number): Row[] => {
      return new Array(end - start).fill(null)
        .map((_, index) => ({ id: start + index }))
    }),
  }
}

describe('rowCache', () => {
  it('should fetch uncached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)
    const rows = await awaitRows(dfCached.rows(0, 3))
    expect(rows).toEqual([{ id: 0 }, { id: 1 }, { id: 2 }])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(0, 3, undefined)
  })

  it('should return cached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Initial fetch to cache rows
    const rowsPre = await awaitRows(dfCached.rows(3, 6))
    expect(rowsPre).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(3, 6, undefined)

    // Subsequent fetch should use cache
    const rowsPost = await awaitRows(dfCached.rows(3, 6))
    expect(rowsPost).toEqual([{ id: 3 }, { id: 4 }, { id: 5 }])
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
      { id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }
    ])
    expect(df.rows).toHaveBeenCalledTimes(2)
  })

  // it('should handle overlapping cached blocks', async () => {
  //   const df = makeDf()
  //   const dfCached = rowCache(df)

  //   // Cache first block
  //   dfCached.rows(6, 9)

  //   // Fetch overlapping block
  //   const overlappingRows = dfCached.rows(8, 11)
  //   expect(overlappingRows).toEqual([[8], [9], [10]])
  //   expect(df.rows).toHaveBeenCalledTimes(2)
  //   expect(df.rows).toHaveBeenCalledWith(8, 10)
  // })
})
