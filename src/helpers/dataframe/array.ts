import { createGetRowNumber, createNoOpFetch, validateGetCellParams } from './helpers.js'
import type { DataFrameSimple, ResolvedValue } from './types.js'

export function fromArray(array: Record<string, any>[]): DataFrameSimple {
  // beware: we don't copy the array, so it must not be mutated after this point.
  const header = 0 in array ? Object.keys(array[0]) : []
  const numRows = array.length

  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    validateGetCellParams({ row, column, data: { numRows, header } })
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
    getRowNumber: createGetRowNumber({ numRows }),
    getCell,
    fetch: createNoOpFetch({ getCell, numRows, header }),
  }
}
