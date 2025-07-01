import { DataFrame, ResolvedValue, UnsortableDataFrame } from './types.js'

export function createGetRowNumber({ numRows }: {numRows: number}) {
  return ({ row }: { row: number }): ResolvedValue<number> => {
    if (row < 0 || row >= numRows || !Number.isInteger(row)) {
      throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
    }
    return { value: row }
  }
}

export function createNoOpFetch({ getCell, numRows, header }: Pick<UnsortableDataFrame, 'getCell' | 'numRows' | 'header'>): UnsortableDataFrame['fetch'] {
  return ({ rowStart, rowEnd, columns, signal }) => {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
    // Validation
    validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })

    for (const column of columns) {
      for (let row = rowStart; row < rowEnd; row++) {
        if (getCell({ row, column }) === undefined) {
          throw new Error(`Cell not found for row ${row} and column "${column}", and this is a static data frame.`)
        }
      }
    }

    return Promise.resolve()
  }
}

export function validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } }: {rowStart: number, rowEnd: number, columns: string[], data: Pick<DataFrame, 'numRows' | 'header'>}): void {
  if (rowStart < 0 || rowEnd > numRows || !Number.isInteger(rowStart) || !Number.isInteger(rowEnd) || rowStart >= rowEnd) {
    throw new Error(`Invalid row range: ${rowStart} - ${rowEnd}, numRows: ${numRows}`)
  }
  if (columns.length === 0 || columns.some(column => !header.includes(column))) {
    throw new Error(`Invalid columns: ${columns.join(', ')}. Available columns: ${header.join(', ')}`)
  }
}

export function validateGetCellParams({ row, column, data: { numRows, header } }: {row: number, column: string, data: Pick<DataFrame, 'numRows' | 'header'>}): void {
  if (row < 0 || row >= numRows || !Number.isInteger(row)) {
    throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
  }
  if (!header.includes(column)) {
    throw new Error(`Invalid column: ${column}. Available columns: ${header.join(', ')}`)
  }
}
