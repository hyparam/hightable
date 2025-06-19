import { CustomEventTarget, createEventTarget } from '../typedEventTarget.js'
import { CancellableJob, Cells, CommonDataFrameEvents, ResolvedValue } from './types.js'

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
  fetch?: ({ rowStart, rowEnd, columns }: { rowStart: number, rowEnd: number, columns: string[] }) => CancellableJob

  // emits events, defined in DataFrameEvents
  eventTarget: CustomEventTarget<UnsortableDataFrameEvents>
}

export function arrayDataFrame(data: Cells[]): UnsortableDataFrame {
  const header = 0 in data ? Object.keys(data[0]) : []

  return {
    numRows: data.length,
    header,
    getCell: ({ row, column }) => {
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
    },
    eventTarget: createEventTarget<UnsortableDataFrameEvents>(),
  }
}
