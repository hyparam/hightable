
export function formatRowNumber(rowIndex?: number): string {
  if (rowIndex === undefined) return ''
  // rowIndex + 1 to display 1-based row numbers
  return (rowIndex + 1).toLocaleString('en-US')
}
