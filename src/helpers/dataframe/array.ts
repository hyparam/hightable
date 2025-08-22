import { validateGetCellParams, validateGetRowNumberParams } from './helpers.js'
import type { DataFrame, Obj, ResolvedValue } from './types.js'
import type { OrderBy } from '../sort.js'

export function arrayDataFrame<M extends Obj, C extends Obj>(
  array: Record<string, any>[], rowNumbers?: number[], { metadata, columnsMetadata }: { metadata?: M, columnsMetadata?: C[] } = {}
): DataFrame<M, C> {
  // beware: we don't copy the array, so it must not be mutated after this point.
  const firstRowColumns = 0 in array ? Object.keys(array[0]) : []
  if (columnsMetadata && columnsMetadata.length !== firstRowColumns.length) {
    throw new Error(`Columns metadata length (${columnsMetadata.length}) does not match the number of columns in the array (${firstRowColumns.length})`)
  }
  const columnDescriptors = firstRowColumns.map((name, i) => ({ name, metadata: columnsMetadata?.[i] }))
  const numRows = array.length
  if (rowNumbers && rowNumbers.length !== numRows) {
    throw new Error(`Row numbers length (${rowNumbers.length}) does not match the number of rows in the array (${numRows})`)
  }
  if (rowNumbers?.some(row => row < 0 || !Number.isInteger(row))) {
    // No upper limit because we don't know how many rows the underlying data has.
    throw new Error(`Row numbers must be non-negative integers, but got: ${rowNumbers.join(', ')}`)
  }

  function getRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> {
    validateGetRowNumberParams({ row, orderBy, data: { numRows, columnDescriptors } })
    if (!rowNumbers) {
      return { value: row }
    }
    if (rowNumbers[row] === undefined) {
      throw new Error(`Row number not found for row ${row}, but row numbers are provided.`)
    }
    return { value: rowNumbers[row] }
  }

  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    validateGetCellParams({ column, row, orderBy, data: { numRows, columnDescriptors } })
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

  return { metadata, numRows, columnDescriptors, getRowNumber, getCell }
}
