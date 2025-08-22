import { createEventTarget } from '../typedEventTarget.js'
import { checkSignal, getContinuousRanges, validateColumn, validateFetchParams, validateRow } from './helpers.js'
import type { DataFrame, DataFrameEvents, Fetch, Obj } from './types.js'
import { type OrderBy, validateOrderBy } from '../sort.js'

// return an unsortable data frame: we can call sortableDataFrame on it later, so that we sort on a small subset of the data
export function filterDataFrame<M extends Obj, C extends Obj>(
  { data, filter }: { data: DataFrame<M, C>, filter: ({ row }: { row: number }) => boolean }
): DataFrame<M, C> {
  const upstreamRows = Array.from({ length: data.numRows }, (_, upstreamRow) => upstreamRow).filter(upstreamRow => filter({ row: upstreamRow }))
  const numRows = upstreamRows.length
  const columnDescriptors = data.columnDescriptors.map(({ name, metadata }) => ({
    name,
    sortable: false,
    metadata: structuredClone(metadata), // Create a deep copy of the column metadata to avoid mutating the original
  }))
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
  function getRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }) {
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
    const upstreamRow = getUpstreamRow({ row })
    return data.getRowNumber({ row: upstreamRow })
  }
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) {
    validateColumn({ column, data: { columnDescriptors } })
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
    const upstreamRow = getUpstreamRow({ row })
    return data.getCell({ row: upstreamRow, column })
  }

  const { fetch: upstreamFetch } = data
  const df: DataFrame<M, C> = {
    metadata,
    columnDescriptors,
    numRows,
    getRowNumber,
    getCell,
  }

  if (upstreamFetch !== undefined) {
    const eventTarget = createEventTarget<DataFrameEvents>()
    const fetch: Fetch = async function({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) {
      validateFetchParams({ rowStart, rowEnd, columns, orderBy, data: { numRows, columnDescriptors } })
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
