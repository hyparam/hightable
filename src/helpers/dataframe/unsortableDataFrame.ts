import { CustomEventTarget, createEventTarget } from '../typedEventTarget.js'
import { Cells, CommonDataFrameEvents, ResolvedValue } from './types.js'

// Map of event type -> detail
export interface UnsortableDataFrameEvents extends CommonDataFrameEvents{
  'dataframe:update': { rowStart: number, rowEnd: number, columns: string[], orderBy?: undefined };
}

/**
 * UnsortableDataFrame is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface UnsortableDataFrame {
  numRows: number
  header: string[]
  sortable?: false // indicates that this DataFrame does not support sorting

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column }: {row: number, column: string}): ResolvedValue | undefined

  // initiate fetches for row/column data
  // static data frames don't need to implement it
  // rowEnd is exclusive
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  // if the signal is aborted, fetch should reject with an AbortError DOMException. Note that onColumnComplete might have already been called for some columns.
  // TODO(SL): should we pass a callback for errors (onError)? or dispatch an event using eventTarget?
  fetch({ rowStart, rowEnd, columns, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal, onColumnComplete?: (data: any[]) => void }): Promise<void>

  // emits events, defined in DataFrameEvents
  eventTarget: CustomEventTarget<UnsortableDataFrameEvents>
}

export function arrayDataFrame(data: Cells[]): UnsortableDataFrame {
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
    return { value: cells[column] }
    // Note that this function never returns undefined (meaning pending cell), because the data is static.
  }

  return {
    numRows: data.length,
    header,
    getCell,
    fetch: getStaticFetch({ getCell }),
    eventTarget: createEventTarget<UnsortableDataFrameEvents>(),
  }
}

export function getStaticFetch({ getCell }: {getCell: UnsortableDataFrame['getCell']}): UnsortableDataFrame['fetch'] {
  return ({ rowStart, rowEnd, columns, signal, onColumnComplete }) => {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
    // This is a static data frame, so the only purpose of this method is if onColumnComplete is passed
    if (onColumnComplete && columns.length > 0) {
      for (const column of columns) {
        const slice = Array(rowEnd - rowStart).fill(undefined).map((_, i) => {
          return getCell({ row: rowStart + i, column })
        })
        onColumnComplete(slice)
      }
    }
    return Promise.resolve()
  }
}

/**
 * Fetch a range of data from one column in an UnsortableDataFrame.
 *
 * It requires the unsortableDataFrame to return the values in onColumnComplete.
 *
 * The range is defined by [rowStart, rowEnd), where rowEnd is exclusive.
 * The range must be within the bounds of the dataframe.
 *
 * @param {Object} params
 * @param {string} params.column The column name to fetch data from.
 * @param {number} params.rowStart The starting row index (inclusive).
 * @param {number} params.rowEnd The ending row index (exclusive).
 * @param {UnsortableDataFrame} params.unsortableDataFrame The UnsortableDataFrame to fetch data from.
 * @param {AbortSignal} [params.signal] A signal to cancel the fetch operation. If the signal is aborted, the function rejects with an AbortError DOMException.
 *
 * @returns {any[]} data as an array of values.
 */
export function fetchRange({ unsortableDataFrame, column, rowStart, rowEnd, signal }: {unsortableDataFrame: UnsortableDataFrame, column: string, rowStart: number, rowEnd: number, signal?: AbortSignal}): Promise<any[]> {
  const length = rowEnd - rowStart
  return new Promise((resolve, reject) => {
    function onColumnComplete(data: any[]) {
      if (data.length !== length) {
        reject(new Error(`Fetched data length ${data.length} does not match expected length ${length}`))
      }
      resolve(data)
    }
    // Fetch the data
    unsortableDataFrame.fetch({ rowStart, rowEnd, columns: [column], signal, onColumnComplete }).catch((error) => {
      reject(error)
    })
  })
}

/**
 * Fetch a column from an UnsortableDataFrame.
 *
 * This function fetches the values of a column, filling in missing values with data fetched in ranges.
 * It handles consecutive missing rows by fetching them in ranges, which is more efficient than fetching each row individually.
 *
 * @param {Object} params
 * @param {UnsortableDataFrame} params.unsortableDataFrame The UnsortableDataFrame to fetch data from.
 * @param {string} params.column The column name to fetch data from.
 * @param {AbortSignal} [params.signal] A signal to cancel the fetch operation. If the signal is aborted, the function rejects with an AbortError DOMException.
 *
 * @returns {Promise<any[]>} A promise that resolves to an array of values for the specified column.
 */
export async function fetchColumn({ unsortableDataFrame, column, signal }: {unsortableDataFrame: UnsortableDataFrame, column: string, signal?: AbortSignal}): Promise<any[]> {
  const values = Array(unsortableDataFrame.numRows).fill(undefined)
  const missingRangePromises: Promise<void>[] = []
  let currentRange: {rowStart: number, rowEnd: number} | undefined = undefined
  for (let row = 0; row < unsortableDataFrame.numRows; row++) {
    const cell = unsortableDataFrame.getCell({ row, column })
    if (cell) {
      values[row] = cell.value
    } else {
      if (currentRange === undefined) {
        // First iteration
        currentRange = { rowStart: row, rowEnd: row + 1 }
      } else {
        const { rowStart, rowEnd } = currentRange
        if (rowEnd !== row) {
          // The row is not consecutive to the current range.
          // Fetch the previous range
          missingRangePromises.push(
            fetchRange({ unsortableDataFrame, column, rowStart, rowEnd, signal }).then((data) => {
              for (const [i, value] of data.entries()) {
                values[rowStart + i] = value
              }
            })
          )
          // and start a new one.
          currentRange.rowStart = row
        }
        currentRange.rowEnd = row + 1
      }
    }
  }
  if (currentRange) {
    const { rowStart, rowEnd } = currentRange
    // Fetch the last range.
    const rangePromise = fetchRange({ unsortableDataFrame, column, rowStart, rowEnd, signal }).then((data) => {
      for (const [i, value] of data.entries()) {
        values[rowStart + i] = value
      }
    })
    missingRangePromises.push(rangePromise)
  }

  await Promise.all(missingRangePromises)
  return values
}
