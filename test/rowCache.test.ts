import { describe, expect, it, vi } from 'vitest'
import { rowCache } from '../src/rowCache.js'

// Mock DataFrame
function makeDf() {
  return {
    header: ['id'],
    numRows: 10,
    rows: vi.fn(async (start: number, end: number): Promise<Record<string, any>[]> => {
      return new Array(end - start).fill(null).map((_, index) => [start + index])
    }),
  }
}

describe('rowCache', () => {
  it('should fetch uncached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)
    const rows = await dfCached.rows(0, 3)
    expect(rows).toEqual([[0], [1], [2]])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(0, 3, undefined)
  })

  it('should return cached rows', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Initial fetch to cache rows
    const rowsPre = await dfCached.rows(3, 6)
    expect(rowsPre).toEqual([[3], [4], [5]])
    expect(df.rows).toHaveBeenCalledTimes(1)
    expect(df.rows).toHaveBeenCalledWith(3, 6, undefined)

    // Subsequent fetch should use cache
    const rowsPost = await dfCached.rows(3, 6)
    expect(rowsPost).toEqual([[3], [4], [5]])
    expect(df.rows).toHaveBeenCalledTimes(1)
  })

  it('should handle adjacent cached blocks', async () => {
    const df = makeDf()
    const dfCached = rowCache(df)

    // Cache first block
    await dfCached.rows(0, 3)
    expect(df.rows).toHaveBeenCalledTimes(1)
    // Cache adjacent block
    await dfCached.rows(3, 6)
    expect(df.rows).toHaveBeenCalledTimes(2)
    // Fetch combined block
    const adjacentRows = await dfCached.rows(0, 6)

    expect(adjacentRows).toEqual([[0], [1], [2], [3], [4], [5]])
    expect(df.rows).toHaveBeenCalledTimes(2)
  })

  // it('should handle overlapping cached blocks', async () => {
  //   const df = makeDf()
  //   const dfCached = rowCache(df)

  //   // Cache first block
  //   await dfCached.rows(6, 9)

  //   // Fetch overlapping block
  //   const overlappingRows = await dfCached.rows(8, 11)
  //   expect(overlappingRows).toEqual([[8], [9], [10]])
  //   expect(df.rows).toHaveBeenCalledTimes(2)
  //   expect(df.rows).toHaveBeenCalledWith(8, 10)
  // })
})
