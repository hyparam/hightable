import { OrderBy, validateOrderBy } from '../sort.js'
import { DataFrame, ResolvedValue } from './types.js'

export function createGetRowNumber({ numRows }: { numRows: number }) {
  return ({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> => {
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
    return { value: row }
  }
}

export function validateFetchParams<C>({ rowStart, rowEnd, columns, orderBy, data }: {rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, data: Pick<DataFrame<any, C>, 'numRows' | 'columnDescriptors'>}): void {
  if (rowStart < 0 || rowEnd > data.numRows || !Number.isInteger(rowStart) || !Number.isInteger(rowEnd) || rowStart > rowEnd) {
    throw new Error(`Invalid row range: ${rowStart} - ${rowEnd}, numRows: ${data.numRows}`)
  }
  const columnNames = data.columnDescriptors.map(c => c.name)
  if (columns?.some(column => !columnNames.includes(column))) {
    throw new Error(`Invalid columns: ${columns.join(', ')}. Available columns: ${columnNames.join(', ')}`)
  }
  const sortableColumns = new Set(data.columnDescriptors.filter(c => c.sortable).map(c => c.name))
  validateOrderBy({ orderBy, sortableColumns })
}

export function validateRow({ row, data: { numRows } }: {row: number, data: Pick<DataFrame, 'numRows'>}): void {
  if (row < 0 || row >= numRows || !Number.isInteger(row)) {
    throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
  }
}

export function validateColumn<C>({ column, data: { columnDescriptors } }: { column: string, data: Pick<DataFrame<any, C>, 'columnDescriptors'> }): void {
  const columnNames = columnDescriptors.map(c => c.name)
  if (!columnNames.includes(column)) {
    throw new Error(`Invalid column: ${column}. Available columns: ${columnNames.join(', ')}`)
  }
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
