import { DataFrame, ResolvedValue, UnsortableDataFrame } from './types.js'

export function createGetRowNumber({ numRows }: {numRows: number}) {
  return ({ row }: { row: number }): ResolvedValue<number> => {
    validateRow({ row, data: { numRows } })
    return { value: row }
  }
}

export function createStaticFetch({ getRowNumber, getCell, numRows, header }: Pick<UnsortableDataFrame, 'getRowNumber' | 'getCell' | 'numRows' | 'header'>): UnsortableDataFrame['fetch'] {
  return async ({ rowStart, rowEnd, columns, signal }) => {
    if (signal?.aborted) {
      throw new DOMException('Fetch aborted', 'AbortError')
    }
    // Validation
    validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })

    for (let row = rowStart; row < rowEnd; row++) {
      if (!getRowNumber({ row })) {
        throw new Error(`Row number not found for row ${row}, and this is a static data frame.`)
      }
      for (const column of columns ?? []) {
        if (getCell({ row, column }) === undefined) {
          throw new Error(`Cell not found for row ${row} and column "${column}", and this is a static data frame.`)
        }
      }
    }

    await Promise.resolve()
  }
}

export function validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } }: {rowStart: number, rowEnd: number, columns?: string[], data: Pick<DataFrame, 'numRows' | 'header'>}): void {
  if (rowStart < 0 || rowEnd > numRows || !Number.isInteger(rowStart) || !Number.isInteger(rowEnd) || rowStart >= rowEnd) {
    throw new Error(`Invalid row range: ${rowStart} - ${rowEnd}, numRows: ${numRows}`)
  }
  if (columns && columns.length > 0 && columns.some(column => !header.includes(column))) {
    throw new Error(`Invalid columns: ${columns.join(', ')}. Available columns: ${header.join(', ')}`)
  }
}

export function validateRow({ row, data: { numRows } }: {row: number, data: Pick<DataFrame, 'numRows'>}): void {
  if (row < 0 || row >= numRows || !Number.isInteger(row)) {
    throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
  }
}

export function validateColumn({ column, data: { header } }: {column: string, data: Pick<DataFrame, 'header'>}): void {
  if (!header.includes(column)) {
    throw new Error(`Invalid column: ${column}. Available columns: ${header.join(', ')}`)
  }
}
