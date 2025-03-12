import type { PartialRow } from './row.js'

export function formatRowNumber(rowIndex?: number): string {
  if (rowIndex === undefined) return ''
  // rowIndex + 1 to display 1-based row numbers
  return (rowIndex + 1).toLocaleString('en-US')
}

/**
 * Validate row length
 */
export function rowError(row: PartialRow, length: number): string | undefined {
  const numKeys = Object.keys(row.cells).length
  if (numKeys > 0 && numKeys !== length) {
    return `Row ${formatRowNumber(row.index)} length ${numKeys} does not match header length ${length}`
  }
}
