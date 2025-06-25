import { CustomEventTarget, cloneEventTarget, createEventTarget } from '../typedEventTarget.js'
import { Cells, DataFrameEvents, ResolvedValue } from './types.js'

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
  fetch({ rowStart, rowEnd, columns, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal, onColumnComplete?: (data: {column: string, values: any[]}) => void }): Promise<void>

  // emits events, defined in DataFrameEvents
  eventTarget: CustomEventTarget<DataFrameEvents>
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
    eventTarget: createEventTarget<DataFrameEvents>(),
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
        onColumnComplete({ column, values: slice })
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
    function onColumnComplete(data: {column: string, values: any[]}) {
      if (data.values.length !== length) {
        reject(new Error(`Fetched data length ${data.values.length} does not match expected length ${length}`))
      }
      if (data.column !== column) {
        reject(new Error(`Data fetched for column "${data.column}" while the requested column was "${column}"`))
      }
      resolve(data.values)
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

export function cacheUnsortableDataFrame({ numRows, header, getCell, fetch, eventTarget }: UnsortableDataFrame): UnsortableDataFrame {
  const cachedColumns: Record<string, (ResolvedValue | undefined)[]> = header.reduce<Record<string, any[]>>((acc, column) => {
    acc[column] = Array(numRows).fill(undefined)
    return acc
  }, {})

  const { eventTarget: wrappedEventTarget } = cloneEventTarget(eventTarget, ['dataframe:numrowschange', 'dataframe:update'])
  // TODO(SL): get "detach" function from cloneEventTarget and call it when the dataframe is no longer needed
  // for example, by providing a "dispose" method on the returned dataframe

  function wrappedFetch({ rowStart, rowEnd, columns, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal, onColumnComplete?: (data: {column: string, values: any[]}) => void }) {
    if (signal?.aborted) {
      return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
    }
    function onColumnCompleteWrapper({ column, values }: {column: string, values: any[]}) {
      if (signal?.aborted) {
        console.warn('Fetch aborted while processing onColumnComplete')
        return
      }
      if (onColumnComplete) {
        onColumnComplete({ column, values })
      }
      const cachedColumn = cachedColumns[column]
      if (!cachedColumn) {
        console.warn(`Column "${column}" not found in cached columns`)
        return
      }
      // Cache the fetched data
      let numUpdatedValues = 0
      for (const [i, value] of values.entries()) {
        const currentCachedCell = cachedColumn[rowStart + i]
        if (!currentCachedCell || currentCachedCell.value !== value) {
          cachedColumn[rowStart + i] = { value }
          numUpdatedValues++
        }
      }

      if (numUpdatedValues > 0) {
        // Dispatch an event to notify that the column has been updated
        wrappedEventTarget.dispatchEvent(new CustomEvent('dataframe:update', {
          detail: { columns: [column], rowStart, rowEnd },
        }))
        console.debug(`Cached column "${column}" from row ${rowStart} to ${rowEnd}, updated ${numUpdatedValues} values`)
      }

      // console.debug(`No changes for column "${column}" from row ${rowStart} to ${rowEnd}`)

    }

    // Fetch the data
    return fetch({ rowStart, rowEnd, columns, signal, onColumnComplete: onColumnCompleteWrapper })
  }

  function wrappedGetCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    if (row < 0 || row >= numRows) {
      throw new Error(`Invalid row index: ${row}. Must be between 0 and ${numRows - 1}.`)
    }
    const cachedColumn = cachedColumns[column]
    if (!header.includes(column) || !cachedColumn) {
      throw new Error(`Invalid column: ${column}. Available columns: ${header.join(', ')}`)
    }
    // Return the cached value, which might be undefined (meaning pending)
    return cachedColumn[row] ?? getCell({ row, column })
    // TODO(SL): does it make sense to use the original getCell here?
    // If it has a value, should we cache it? or is wrappedFetch the only way to cache values?
  }

  return {
    numRows,
    header,
    getCell: wrappedGetCell,
    fetch: wrappedFetch,
    eventTarget: wrappedEventTarget,
  }
}
