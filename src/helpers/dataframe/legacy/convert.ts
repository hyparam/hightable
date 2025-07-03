import { createEventTarget } from '../../typedEventTarget.js'
import { checkSignal, getContinuousRanges, validateColumn, validateFetchParams, validateRow } from '../helpers.js'
import { DataFrame, DataFrameEvents, ResolvedValue, UnsortableDataFrame, sortableDataFrame } from '../index.js'
import { DataFrameV1 } from './dataframeV1.js'

export function convertV1ToDataFrame(data: DataFrameV1): DataFrame {
  const unsortableDataFrame = convertV1ToUnsortableDataFrame(data)
  if (!data.sortable) {
    return unsortableDataFrame
  }
  // For simplicity, this helper uses sortableDataFrame to add sorting capabilities.
  // This implementation might be less efficient than the original one.
  // Consider creating a native DataFrame implementation instead if performance is a concern.
  return sortableDataFrame(unsortableDataFrame)
}

export function convertV1ToUnsortableDataFrame(data: DataFrameV1): UnsortableDataFrame {
  const header = data.header.slice()
  const { numRows } = data

  const eventTarget = createEventTarget<DataFrameEvents>()

  // Create a local cache for the row numbers and the cells.
  const rowNumbersCache = new Map<number, ResolvedValue<number>>()
  const cellsCache = new Map<string, Map<number, ResolvedValue>>()

  function getRowNumber({ row }: { row: number }): ResolvedValue<number> | undefined {
    validateRow({ row, data: { numRows } })
    return rowNumbersCache.get(row)
  }

  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    validateRow({ row, data: { numRows } })
    validateColumn({ column, data: { header } })
    return cellsCache.get(column)?.get(row)
  }

  async function fetch({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns?: string[], signal?: AbortSignal }): Promise<void> {
    validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })
    checkSignal(signal)

    // only fetch the required rows and columns
    const rowsToFetch = Array.from({ length: rowEnd - rowStart }, (_, i) => rowStart + i).filter(
      row => !getRowNumber({ row }) || columns?.some(column => !getCell({ row, column }))
    )
    if (rowsToFetch.length === 0) {
      // If all rows and columns are already fetched, we can return immediately.
      return
    }
    const rangesToFetch = getContinuousRanges(rowsToFetch)

    const promises: Promise<any>[] = []
    for (const range of rangesToFetch) {
      const { rowStart, rowEnd } = range
      const asyncRows = data.rows({ start: rowStart, end: rowEnd })

      for (const [i, asyncRow] of asyncRows.entries()) {
        const rowIndex = rowStart + i
        const { index, cells } = asyncRow
        promises.push(index.then(rowNumber => {
          checkSignal(signal)
          const cachedRowNumber = rowNumbersCache.get(rowIndex)
          if (!cachedRowNumber || cachedRowNumber.value !== rowNumber) {
            rowNumbersCache.set(rowIndex, { value: rowNumber })
            eventTarget.dispatchEvent(new CustomEvent('resolve'))
          }
        }))
        for (const column of header) {
          if (cells[column] === undefined) {
            continue
          }
          const cell = cells[column]
          promises.push(cell.then(value => {
            checkSignal(signal)
            if (!cellsCache.has(column)) {
              cellsCache.set(column, new Map())
            }
            const cachedCell = cellsCache.get(column)?.get(rowIndex)
            if (!cachedCell || cachedCell.value !== value) {
              cellsCache.get(column)?.set(rowIndex, { value })
              eventTarget.dispatchEvent(new CustomEvent('resolve'))
            }
          }))
        }
      }
    }
    await Promise.all(promises)
  }

  return {
    header,
    numRows,
    getRowNumber,
    getCell,
    fetch,
    eventTarget,
  }
}
