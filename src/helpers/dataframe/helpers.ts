import { OrderBy, validateOrderByAgainstSortableColumns } from '../sort.js'
import { DataFrame, ResolvedValue } from './types.js'

export function createGetRowNumber(data: Pick<DataFrame, 'numRows'>) {
  return ({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> => {
    validateRow({ row, data: { numRows: data.numRows } })
    // orderBy is not supported in this function, so we throw if orderBy is defined.
    if (orderBy && orderBy.length > 0) {
      throw new Error('orderBy is not supported in this getRowNumber implementation.')
    }
    return { value: row }
  }
}

export function validateGetRowNumberParams({ row, orderBy, data }: {row: number, orderBy?: OrderBy, data: Pick<DataFrame, 'numRows' | 'columnDescriptors'>}): void {
  validateRow({ row, data: { numRows: data.numRows } })
  validateOrderBy({ orderBy, data: { columnDescriptors: data.columnDescriptors } })
}

export function validateGetCellParams({ row, column, orderBy, data }: { row: number, column: string, orderBy?: OrderBy, data: Pick<DataFrame, 'numRows' | 'columnDescriptors'> }): void {
  validateRow({ row, data: { numRows: data.numRows } })
  validateColumn({ column, data: { columnDescriptors: data.columnDescriptors } })
  validateOrderBy({ orderBy, data: { columnDescriptors: data.columnDescriptors } })
}

export function validateFetchParams({ rowStart, rowEnd, columns, orderBy, data }: {rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, data: Pick<DataFrame, 'numRows' | 'columnDescriptors'>}): void {
  if (rowStart < 0 || rowEnd > data.numRows || !Number.isInteger(rowStart) || !Number.isInteger(rowEnd) || rowStart > rowEnd) {
    throw new Error(`Invalid row range: ${rowStart} - ${rowEnd}, numRows: ${data.numRows}`)
  }
  const columnNames = data.columnDescriptors.map(c => c.name)
  if (columns?.some(column => !columnNames.includes(column))) {
    throw new Error(`Invalid columns: ${columns.join(', ')}. Available columns: ${columnNames.join(', ')}`)
  }
  validateOrderBy({ orderBy, data })
}

export function validateRow({ row, data }: { row: number, data: Pick<DataFrame, 'numRows'> }): void {
  if (row < 0 || row >= data.numRows || !Number.isInteger(row)) {
    throw new Error(`Invalid row index: ${row}, numRows: ${data.numRows}`)
  }
}

export function validateColumn({ column, data }: { column: string, data: Pick<DataFrame, 'columnDescriptors'> }): void {
  const columnNames = data.columnDescriptors.map(c => c.name)
  if (!columnNames.includes(column)) {
    throw new Error(`Invalid column: ${column}. Available columns: ${columnNames.join(', ')}`)
  }
}

export function validateOrderBy({ orderBy, data }: { orderBy?: OrderBy, data: Pick<DataFrame, 'columnDescriptors' | 'exclusiveSort'> }): void {
  const sortableColumns = new Set(data.columnDescriptors.filter(c => c.sortable).map(c => c.name))
  validateOrderByAgainstSortableColumns({ orderBy, sortableColumns, exclusiveSort: data.exclusiveSort })
}

export function checkSignal(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError')
  }
}

export function getContinuousRanges(sortedRows: number[]): {rowStart: number, rowEnd: number}[] {
  // We assume sortedRows is already sorted and contains unique values.
  const ranges: {rowStart: number, rowEnd: number}[] = []
  let range: {rowStart: number, rowEnd: number} | undefined = undefined
  for (const row of sortedRows) {
    if (range === undefined) {
      range = { rowStart: row, rowEnd: row + 1 }
    } else if (row === range.rowEnd) {
      // Extend the current range
      range.rowEnd += 1
    } else {
      // Push the current range and start a new one
      ranges.push(range)
      range = { rowStart: row, rowEnd: row + 1 }
    }
  }
  if (range) {
    // Push the last range
    ranges.push(range)
  }
  return ranges
}
