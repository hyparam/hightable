import { DataFrame, ResolvedValue } from './types.js'

export function createGetRowNumber({ numRows }: {numRows: number}) {
  return ({ row }: { row: number }): ResolvedValue<number> => {
    if (row < 0 || row >= numRows || !Number.isInteger(row)) {
      throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
    }
    return { value: row }
  }
}

export function getNoOpFetch({ getCell, numRows, header }: Pick<DataFrame, 'getCell' | 'numRows' | 'header'>): DataFrame['fetch'] {
  return ({ rowStart, rowEnd, columns, signal, onColumnComplete, orderBy }) => {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
    // Validation
    validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })

    // TODO(SL): remove
    if (orderBy && orderBy.length > 0) {
      throw new Error('This fetch method does not support ordering.')
    }
    // TODO(SL): remove
    // This is a static data frame, so the only purpose of this method is if onColumnComplete is passed
    if (onColumnComplete && columns.length > 0) {
      for (const column of columns) {
        const slice = Array(rowEnd - rowStart).fill(undefined).map((_, i) => {
          return getCell({ row: rowStart + i, column })
        })
        onColumnComplete({ column, values: slice })
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
