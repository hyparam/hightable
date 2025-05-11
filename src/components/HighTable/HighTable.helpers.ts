import type { PartialRow } from '../../helpers/row.js'

export function formatRowNumber(rowIndex?: number): string {
  if (rowIndex === undefined) return ''
  // rowIndex + 1 to display 1-based row numbers
  return (rowIndex + 1).toLocaleString('en-US')
}

/**
 * Validate row length
 */
export function rowError(row: PartialRow, headerLength: number): string | undefined {
  // The row.cells object contains all cells, including those for hidden columns
  const numKeys = Object.keys(row.cells).length

  if (numKeys > 0 && numKeys !== headerLength) {
    return `Row ${formatRowNumber(row.index)} length ${numKeys} does not match header length ${headerLength}`
  }
}
