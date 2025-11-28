import { validateGetCellParams, validateGetRowNumberParams } from './helpers.js'
import type { DataFrame, Obj, ResolvedValue } from './types.js'
import type { OrderBy } from '../sort.js'
import type { DataFrameEvents } from './types.js'
import { createEventTarget } from '../typedEventTarget.js'

interface ArrayData {
  readonly _array: Record<string, any>[]
  readonly _rowNumbers?: number[]
}

// We don't copy the array. If it's mutated, the DataFrame will reflect those changes, but be sure to dispatch
// events as needed ('resolve' and 'numrowschange').
// We also don't check if rowNumbers have the same length as the array, or if they are valid indices,
// except when accessing them in getRowNumber. If the array length changes, the user is responsible for updating rowNumbers accordingly.
// Both are exposed in the metadata of the DataFrame if needed.
// TODO(SL): with a Proxy, we could dispatch events on mutation (of values and length) automatically.
export function arrayDataFrame<M extends Obj, C extends Obj>(
  array: Record<string, any>[], rowNumbers?: number[], { metadata, columnsMetadata }: { metadata?: M, columnsMetadata?: C[] } = {}
): ArrayData & DataFrame<M, C> {
  const firstRowColumns = 0 in array ? Object.keys(array[0]) : []
  if (columnsMetadata && columnsMetadata.length !== firstRowColumns.length) {
    throw new Error(`Columns metadata length (${columnsMetadata.length}) does not match the number of columns in the array (${firstRowColumns.length})`)
  }
  const columnDescriptors = firstRowColumns.map((name, i) => ({ name, metadata: columnsMetadata?.[i] }))

  const eventTarget = createEventTarget<DataFrameEvents>()

  // Proxy around the array to emit events on mutation.
  const arrayProxy = new Proxy(array, {
    set(target, prop, value) {
      const result = Reflect.set(target, prop, value)
      if (prop === 'length') {
        eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
      } else {
        eventTarget.dispatchEvent(new CustomEvent('update'))
      }
      return result
    },
  })

  const data = {
    _array: arrayProxy,
    _rowNumbers: rowNumbers,
    metadata,
    columnDescriptors,
    getRowNumber,
    getCell,
    get numRows() {
      return this._array.length
    },
    eventTarget,
  }

  function getRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> | undefined {
    // numRows is Infinity because the array size can change dynamically.
    validateGetRowNumberParams({ row, orderBy, data: { numRows: Infinity, columnDescriptors } })
    if (!rowNumbers) {
      return { value: row }
    }
    if (rowNumbers[row] === undefined) {
      return undefined
    }
    if (rowNumbers[row] < 0 || !Number.isInteger(rowNumbers[row])) {
      throw new Error(`Invalid row number: ${rowNumbers[row]} for row ${row}`)
    }
    return { value: rowNumbers[row] }
  }

  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    // numRows is Infinity because the array size can change dynamically.
    validateGetCellParams({ column, row, orderBy, data: { numRows: Infinity, columnDescriptors } })
    const cells = array[row]
    if (!cells) {
      return undefined
    }
    // Return a resolved value (which might be undefined as well)
    return { value: cells[column] }
  }

  return data
}
