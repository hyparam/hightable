import type { OrderBy } from '../sort.js'
import { cloneEventTarget } from '../typedEventTarget.js'
import type { DataFrame, ResolvedValue } from './types.js'

export function cacheUnsortableDataFrame({ numRows, header, getCell, fetch, eventTarget, sortable }: Omit<DataFrame, 'getUnsortedRow'> & {getUnsortedRow?: ({ row }: { row: number }) => ResolvedValue<number> | undefined}): DataFrame {
  if (sortable) {
    throw new Error('This function is intended for unsortable data frames only. (Create and) use cacheSortableDataFrame for sortable data frames.')
  }
  const cachedColumns: Record<string, (ResolvedValue | undefined)[]> = header.reduce<Record<string, any[]>>((acc, column) => {
    acc[column] = Array(numRows).fill(undefined)
    return acc
  }, {})

  const { eventTarget: wrappedEventTarget } = cloneEventTarget(eventTarget, ['dataframe:numrowschange', 'dataframe:update', 'dataframe:index:update'])
  // TODO(SL!): get "detach" function from cloneEventTarget and call it when the dataframe is no longer needed
  // for example, by providing a "dispose" method on the returned dataframe

  function wrappedFetch({ rowStart, rowEnd, columns, orderBy, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy, signal?: AbortSignal, onColumnComplete?: (data: {column: string, values: any[]}) => void }) {
    if (orderBy && orderBy.length > 0) {
      throw new Error('This fetch method does not support ordering.')
    }
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
    function onColumnCompleteWrapper({ column, values }: {column: string, values: any[]}) {
      if (signal?.aborted) {
        console.debug('Fetch aborted while processing onColumnComplete')
        return
      }
      if (onColumnComplete) {
        onColumnComplete({ column, values })
      }
      const cachedColumn = cachedColumns[column]
      if (!cachedColumn) {
        console.warn(`Column "${column}" not found in cached columns`)
        return
      }
      // Cache the fetched data
      let numUpdatedValues = 0
      for (const [i, value] of values.entries()) {
        const currentCachedCell = cachedColumn[rowStart + i]
        if (!currentCachedCell || currentCachedCell.value !== value) {
          cachedColumn[rowStart + i] = { value }
          numUpdatedValues++
        }
      }

      if (numUpdatedValues > 0) {
        // Dispatch an event to notify that the column has been updated
        wrappedEventTarget.dispatchEvent(new CustomEvent('dataframe:update', {
          detail: { columns: [column], rowStart, rowEnd },
        }))
      }
    }

    // Fetch the data
    return fetch({ rowStart, rowEnd, columns, orderBy, signal, onColumnComplete: onColumnCompleteWrapper })
  }

  function wrappedGetCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    if (orderBy && orderBy.length > 0) {
      throw new Error('This fetch method does not support ordering.')
    }
    if (row < 0 || row >= numRows) {
      throw new Error(`Invalid row index: ${row}. Must be between 0 and ${numRows - 1}.`)
    }
    const cachedColumn = cachedColumns[column]
    if (!header.includes(column) || !cachedColumn) {
      throw new Error(`Invalid column: ${column}. Available columns: ${header.join(', ')}`)
    }
    // Return the cached value, which might be undefined (meaning pending)
    return cachedColumn[row] ?? getCell({ row, column })
    // TODO(SL!): does it make sense to use the original getCell here?
    // If it has a value, should we cache it? or is wrappedFetch the only way to cache values?
  }

  return {
    numRows,
    header,
    sortable: false,
    getUnsortedRow: ({ row }) => ({ value: row }), // for unsortable data frames, the unsorted row is the same as the sorted row
    getCell: wrappedGetCell,
    fetch: wrappedFetch,
    eventTarget: wrappedEventTarget,
  }
}

// RESTORE this?

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
