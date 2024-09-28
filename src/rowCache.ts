import type { DataFrame } from './dataframe.js'

interface RowGroup {
  start: number
  end: number
  rows: Promise<Record<string, any>[]>
}

/**
 * Wrap a dataframe with cached rows.
 *
 * @param df async dataframe to wrap
 */
export function rowCache(df: DataFrame): DataFrame {
  // Row cache is stored as a sorted array of RowGroups, per sort order
  const caches: {[key: string]: RowGroup[]} = {}

  let hits = 0
  let misses = 0

  return {
    ...df,
    async rows(start: number, end: number, orderBy?: string): Promise<Record<string, any>[]> {
      const cache = caches[orderBy || ''] ||= []
      const n = hits + misses
      if (n && !(n % 10)) {
        console.log(`Cache hits: ${hits} / ${hits + misses} (${(100 * hits / (hits + misses)).toFixed(1)}%)`)
      }

      const cacheIndex = cache.findLastIndex(block => block.start <= start)
      let pre: RowGroup | undefined

      // Check for cached rows
      if (cacheIndex >= 0) {
        pre = cache[cacheIndex]
        if (pre.end >= end) {
          // Return cached rows
          hits++
          const rows = await pre.rows
          return rows.slice(start - pre.start, end - pre.start)
        }
      }
      // TODO: check for query spanning multiple cached blocks

      // Otherwise, fetch the rows and cache them
      const post = cache[cacheIndex + 1]

      // Trim the row request to exclude cached rows
      const requestStart = pre && pre.end > start ? pre.end : start
      const requestEnd = post && post.start < end ? post.start : end

      // Fetch rows
      misses++
      const rows = await df.rows(requestStart, requestEnd, orderBy)

      // Add new rows to the cache, and merge adjacent row groups
      if (pre && pre.end === requestStart) {
        // Append new rows to existing pre RowGroup
        pre.end = requestEnd
        pre.rows = pre.rows.then(preRows => preRows.concat(rows))
      } else {
        // Insert new RowGroup into cache
        pre = { start: requestStart, end: requestEnd, rows: Promise.resolve(rows) }
        // Insert cached row group into cache after pre
        cache.splice(cacheIndex + 1, 0, pre)
      }

      // merge adjacent row groups
      if (post && post.start === pre.end) {
        pre.end = post.end
        pre.rows = pre.rows.then(preRows => post.rows.then(postRows => preRows.concat(postRows)))
      }

      // get merged rows from cache
      if (rows.length !== end - start) {
        if (pre.end < end) throw new Error('invalid merged cache state')

        // Return cached rows
        hits++
        const rows = await pre.rows
        return rows.slice(start - pre.start, end - pre.start)
      }

      return rows
    },
  }
}
