import { AsyncRow, asyncRows, DataFrame } from './dataframe.js'

/**
 * Wrap a dataframe with cached rows.
 *
 * @param df async dataframe to wrap
 */
export function rowCache(df: DataFrame): DataFrame {
  // Row cache is stored as a sorted array of RowGroups, per sort order
  const caches: {[key: string]: AsyncRow[]} = {}

  let hits = 0
  let misses = 0

  return {
    ...df,
    rows(start: number, end: number, orderBy?: string): AsyncRow[] {
      // Cache per sort order
      const cache = caches[orderBy || ''] ||= new Array(df.numRows)
      const n = hits + misses
      if (n && !(n % 10)) {
        console.log(`Cache hits: ${hits} / ${hits + misses} (${(100 * hits / (hits + misses)).toFixed(1)}%)`)
      }

      // Fetch missing rows in contiguous blocks
      let blockStart: number | undefined
      for (let i = start; i < end; i++) {
        if (!cache[i]) {
          if (blockStart === undefined) {
            blockStart = i
          }
        } else if (blockStart !== undefined) {
          const blockEnd = i
          const futureRows = asyncRows(df.rows(blockStart, blockEnd, orderBy), df.numRows, df.header)
          for (let j = 0; j < blockEnd - blockStart; j++) {
            cache[blockStart + j] = futureRows[j]
          }
          blockStart = undefined
        }
      }
      // Fetch the last block if needed
      if (blockStart !== undefined) {
        const blockEnd = end
        const futureRows = asyncRows(df.rows(blockStart, blockEnd, orderBy), df.numRows, df.header)
        for (let j = 0; j < blockEnd - blockStart; j++) {
          cache[blockStart + j] = futureRows[j]
      }
      }

      return cache.slice(start, end)
    },
  }
}
