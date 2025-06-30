import { createEventTarget } from '../typedEventTarget.js'
import { createGetRowNumber, getNoOpFetch, validateGetCellParams } from './helpers.js'
import type { Cells, DataFrame, DataFrameEvents, ResolvedValue } from './types.js'

export function arrayDataFrame(data: Cells[]): DataFrame {
  const header = 0 in data ? Object.keys(data[0]) : []

  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    const cells = data[row]
    if (!cells) {
      throw new Error(`Invalid row index: ${row}`)
    }
    if (!header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    if (!(column in cells)) {
      throw new Error(`Column "${column}" not found in row ${row}`)
    }
    // Return a resolved value (which might be undefined as well)
    // Note that this function never returns undefined (meaning pending cell), because the data is static.
    return { value: cells[column] }
  }

  return {
    numRows: data.length,
    header,
    sortable: false,
    getRowNumber: ({ row }) => ({ value: row }),
    getCell,
    fetch: getStaticFetch({ getCell }),
    eventTarget: createEventTarget<DataFrameEvents>(),
  }
}

export function getStaticFetch({ getCell }: {getCell: DataFrame['getCell']}): DataFrame['fetch'] {
  return ({ rowStart, rowEnd, columns, signal, onColumnComplete, orderBy }) => {
    if (orderBy && orderBy.length > 0) {
      throw new Error('This fetch method does not support ordering.')
    }
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
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

export function fromArray(array: Record<string, any>[]): DataFrame {
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
    fetch: getNoOpFetch({ getCell, numRows, header }),
    eventTarget: createEventTarget<DataFrameEvents>(), // unused
  }
}
