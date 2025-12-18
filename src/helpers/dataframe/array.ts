import type { OrderBy } from '../sort.js'
import { createEventTarget } from '../typedEventTarget.js'
import { validateGetCellParams, validateGetRowNumberParams } from './helpers.js'
import type { ColumnDescriptor, DataFrame, DataFrameEvents, Obj, ResolvedValue } from './types.js'

interface ArrayData {
  readonly _array: Record<string, any>[]
  readonly _rowNumbers?: number[]
}

// We don't copy the array. If it's mutated, the DataFrame will reflect those changes, but be sure to dispatch
// events as needed ('resolve' and 'numrowschange').
// We also don't check if rowNumbers have the same length as the array, or if they are valid indices,
// except when accessing them in getRowNumber. If the array length changes, the user is responsible for updating rowNumbers accordingly.
// Both are exposed as _array and _rowNumbers if needed. Mutations on _array are proxied to emit events.
export function arrayDataFrame<M extends Obj, C extends Obj>(
  array: Record<string, any>[],
  rowNumbers?: number[],
  options: { metadata?: M, columnDescriptors?: ColumnDescriptor<C>[] } = {}
): ArrayData & DataFrame<M, C> {
  // Use the keys of the first row as column names if no column descriptors are provided.
  const columnDescriptors = options.columnDescriptors
    ?? Object.keys(array[0] ?? {}).map(name => ({ name }))

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
    metadata: options.metadata,
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
    // we check against numRows here
    if (!rowNumbers) {
      if (row < array.length) {
        return { value: row }
      }
      return undefined
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
