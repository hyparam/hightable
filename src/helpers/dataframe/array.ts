import { createStaticFetch, validateColumn, validateRow } from './helpers.js'
import type { ResolvedValue, UnsortableDataFrame } from './types.js'

export function arrayDataFrame(array: Record<string, any>[], rowNumbers?: number[]): UnsortableDataFrame {
  // beware: we don't copy the array, so it must not be mutated after this point.
  const header = 0 in array ? Object.keys(array[0]) : []
  const numRows = array.length
  if (rowNumbers && rowNumbers.length !== numRows) {
    throw new Error(`Row numbers length (${rowNumbers.length}) does not match the number of rows in the array (${numRows})`)
  }
  if (rowNumbers?.some(row => row < 0 || !Number.isInteger(row))) {
    // No upper limit because we don't know how many rows the underlying data has.
    throw new Error(`Row numbers must be non-negative integers, but got: ${rowNumbers.join(', ')}`)
  }

  function getRowNumber({ row }: { row: number }): ResolvedValue<number> {
    validateRow({ row, data: { numRows } })
    if (!rowNumbers) {
      return { value: row }
    }
    if (rowNumbers[row] === undefined) {
      throw new Error(`Row number not found for row ${row}, but row numbers are provided.`)
    }
    return { value: rowNumbers[row] }
  }

  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    validateRow({ row, data: { numRows } })
    validateColumn({ column, data: { header } })
    const cells = array[row]
    if (!cells) {
      throw new Error(`Row ${row} not found in data`)
    }
    if (!(column in cells)) {
      throw new Error(`Column "${column}" not found in row ${row}`)
    }
    // Return a resolved value (which might be undefined as well)
    // Note that this function never returns undefined (meaning pending cell), because the data is static.
    return { value: cells[column] }
  }

  return {
    numRows,
    header,
    getRowNumber,
    getCell,
    fetch: createStaticFetch({ getRowNumber, getCell, numRows, header }),
  }
}
