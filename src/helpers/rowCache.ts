// import { DataFrame } from './dataframe.js'
// import { AsyncRow } from './row.js'
// import { OrderBy } from './sort.js'

// /**
//  * Wrap a dataframe with cached rows.
//  *
//  * @param {DataFrame} df async dataframe to wrap
//  */
// export function rowCache(df: DataFrame): DataFrame {
//   // Row cache is stored as a sorted array of RowGroups, per sort order
//   const caches: Record<string, (AsyncRow | undefined)[]> = {}

//   let hits = 0
//   let misses = 0

//   return {
//     ...df,
//     rows({ start, end, orderBy }): AsyncRow[] {
//       // Cache per sort order
//       const key = getKey(orderBy)
//       const cache = caches[key] ?? new Array<AsyncRow | undefined>(df.numRows)
//       if (!(key in caches)) {
//         caches[key] = cache
//       }
//       const n = hits + misses
//       if (n && !(n % 10)) {
//         console.log(`Cache hits: ${hits} / ${hits + misses} (${(100 * hits / (hits + misses)).toFixed(1)}%)`)
//       }

//       // Fetch missing rows in contiguous blocks
//       let blockStart: number | undefined
//       let hasCacheMiss = false
//       for (let i = start; i <= end; i++) {
//         if (i < end && !cache[i]) {
//           blockStart ??= i
//         } else if (blockStart !== undefined) {
//           const blockEnd = i
//           const futureRows = df.rows({ start: blockStart, end: blockEnd, orderBy })
//           for (let j = 0; j < blockEnd - blockStart; j++) {
//             cache[blockStart + j] = futureRows[j]
//           }
//           blockStart = undefined
//           hasCacheMiss = true
//         }
//       }
//       if (hasCacheMiss) misses++
//       else hits++

//       return cache.slice(start, end).map(row => {
//         // Safety check, this should never happen, all the rows should be cached
//         if (!row) {
//           throw new Error('Row not cached')
//         }
//         return row
//       })
//     },
//   }
// }

// function getKey(orderBy?: OrderBy): string {
//   if (!orderBy || orderBy.length === 0) {
//     return ''
//   }
//   if (!(0 in orderBy)) {
//     throw new Error('orderBy should have at least one element')
//   }
//   return JSON.stringify(orderBy)
// }
