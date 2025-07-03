import { createEventTarget } from '../../typedEventTarget.js'
import { checkSignal, validateColumn, validateFetchParams, validateRow } from '../helpers.js'
import { DataFrame, DataFrameEvents, ResolvedValue, UnsortableDataFrame, sortableDataFrame } from '../index.js'
import { DataFrameV1 } from './dataframeV1.js'
import { awaitRows } from './row.js'

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

    const rows = await awaitRows(data.rows({ start: rowStart, end: rowEnd }))
    checkSignal(signal)

    for (const [i, row] of rows.entries()) {
      const rowIndex = rowStart + i
      const { index: rowNumber, cells } = row
      rowNumbersCache.set(rowIndex, { value: rowNumber })
      for (const column of header) {
        const cell = cells[column]
        if (cell === undefined) {
          continue // skip undefined cells
        }
        if (!cellsCache.has(column)) {
          cellsCache.set(column, new Map())
        }
        cellsCache.get(column)?.set(rowIndex, { value: cell })
      }
    }
    eventTarget.dispatchEvent(new CustomEvent('resolve'))
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
