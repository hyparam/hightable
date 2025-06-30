import type { OrderBy } from '../sort.js'
import type { CustomEventTarget } from '../typedEventTarget.js'

export type Cells = Record<string, any>

export interface ResolvedValue<T = any> {
  value: T
}

export interface DataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
  'dataframe:update': { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy };
  'dataframe:index:update': { rowStart: number, rowEnd: number, orderBy?: OrderBy };
}

/**
 * DataFrame is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface DataFrame {
  numRows: number
  header: string[]
  sortable?: boolean // indicates if this DataFrame supports sorting

  // Return the row number (index in the underlying data) for the given row index in the dataframe.
  // undefined if the row number is not available yet.
  getRowNumber({ row, orderBy }: {
    row: number, // row index in the dataframe
    orderBy?: OrderBy
  }): ResolvedValue<number> | undefined

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined

  // initiate fetches for row/column data
  // static data frames don't need to implement it
  // rowEnd is exclusive
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  fetch: ({ rowStart, rowEnd, columns, orderBy, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy, signal?: AbortSignal, onColumnComplete?: (data: {column: string, values: any[]}) => void }) => Promise<void>

  // emits events, defined in DataFrameEvents
  // eventTarget can be used as follows:
  //
  // listen to an event:
  // eventTarget.addEventListener('dataframe:numrowschange', (event) => {
  //   console.log('Number of rows changed:', event.detail.numRows)
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: 42 } }))
  eventTarget: CustomEventTarget<DataFrameEvents>
}
