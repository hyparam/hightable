import { createEventTarget } from '../typedEventTarget.js'
import { checkSignal, getContinuousRanges, validateColumn, validateFetchParams, validateRow } from './helpers.js'
import type { DataFrame, DataFrameEvents, UnsortableDataFrame } from './types.js'

type UnsortableFetch = Exclude<UnsortableDataFrame['fetch'], undefined>

// return an unsortable data frame: we can call sortableDataFrame on it later, so that we sort on a small subset of the data
export function filterDataFrame({ data, filter }: {data: DataFrame, filter: ({ row }: { row: number }) => boolean}): UnsortableDataFrame {
  const upstreamRows = Array.from({ length: data.numRows }, (_, upstreamRow) => upstreamRow).filter(upstreamRow => filter({ row: upstreamRow }))
  const numRows = upstreamRows.length
  const header = data.header.slice() // Create a copy of the header to avoid mutating the original
  const metadata = structuredClone(data.metadata) // Create a deep copy of the metadata to avoid mutating the original
  function getUpstreamRow({ row }: { row: number }) {
    validateRow({ row, data: { numRows } })
    const upstreamRow = upstreamRows[row]
    if (upstreamRow === undefined) {
      // should never happen
      throw new Error(`Upstream row not found for row ${row}.`)
    }
    return upstreamRow
  }
  function getRowNumber({ row }: { row: number }) {
    validateRow({ row, data: { numRows } })
    const upstreamRow = getUpstreamRow({ row })
    return data.getRowNumber({ row: upstreamRow })
  }
  function getCell({ row, column }: { row: number, column: string }) {
    validateColumn({ column, data: { header } })
    validateRow({ row, data: { numRows } })
    const upstreamRow = getUpstreamRow({ row })
    return data.getCell({ row: upstreamRow, column })
  }

  const { fetch: upstreamFetch } = data
  const df: UnsortableDataFrame = {
    metadata,
    header,
    numRows,
    getRowNumber,
    getCell,
  }

  if (upstreamFetch !== undefined) {
    const eventTarget = createEventTarget<DataFrameEvents>()
    const fetch: UnsortableFetch = async function({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns?: string[], signal?: AbortSignal }) {
      validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })
      checkSignal(signal)

      function callback() {
        eventTarget.dispatchEvent(new CustomEvent('resolve'))
      }
      try {
        data.eventTarget?.addEventListener('resolve', callback)
        // The upstream rows are ordered, so we can fetch them by continuous ranges.
        const ranges = getContinuousRanges(upstreamRows.slice(rowStart, rowEnd))
        const promises = ranges.map((range) => upstreamFetch({ ...range, columns, signal }).then(() => {
          checkSignal(signal)
          eventTarget.dispatchEvent(new CustomEvent('resolve'))
        }))
        await Promise.all(promises)
      } finally {
        data.eventTarget?.removeEventListener('resolve', callback)
      }
    }
    df.eventTarget = eventTarget
    df.fetch = fetch
  }

  return df
}
