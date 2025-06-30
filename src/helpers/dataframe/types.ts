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

  'resolve': undefined;
  // TODO(SL): maybe provide more specific events like:
  // 'resolve:cell': { row: number; column: string; };
  // 'resolve:column': { rowStart: number; rowEnd: number; column: string; };
  // or 'resolve:column': { rows: number[]; column: string; };
  // 'resolve:rownumber': undefined;
  // or 'resolve:rownumber': { rowStart: number; rowEnd: number; };
  // but beware: when sorting a dataframe, the row range (rowStart, rowEnd) would need to be converted to a set of ranges in the sorted dataframe.
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

  // Checks if the required data is available, and it not, it fetches it.
  // The method is asynchronous and resolves when all the data has been fetch.
  //
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  //
  // It rejects on the first error, which can be the signal abort (it must throw `AbortError`).
  //
  // It's responsible for dispatching the "cell:resolve" and "rownumber:resolve" events when data has resolved
  // (ie: when some new data is available synchronously with the methods `getCell` and `getRowNumber`).
  // It can dispatch the events multiple times if the data is fetched in chunks.
  //
  // Note that it does not return the data.
  //
  // static data frames will return a Promise that resolves immediately.
  // rowEnd is exclusive
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

/**
 * DataFrame is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface DataFrameSimple {
  numRows: number
  header: string[]

  // Return the row number (index in the underlying data) for the given row index in the dataframe.
  // undefined if the row number is not available yet.
  getRowNumber({ row }: {
    row: number, // row index in the dataframe
  }): ResolvedValue<number> | undefined

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column }: {row: number, column: string}): ResolvedValue | undefined

  // Checks if the required data is available, and it not, it fetches it.
  // The method is asynchronous and resolves when all the data has been fetch.
  //
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  //
  // It rejects on the first error, which can be the signal abort (it must throw `AbortError`).
  //
  // It's responsible for dispatching the "cell:resolve" and "rownumber:resolve" events when data has resolved
  // (ie: when some new data is available synchronously with the methods `getCell` and `getRowNumber`).
  // It can dispatch the events multiple times if the data is fetched in chunks.
  //
  // Note that it does not return the data.
  //
  // static data frames will return a Promise that resolves immediately.
  // rowEnd is exclusive
  // TODO(SL): make it optional
  fetch: ({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal }) => Promise<void>

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

  // TODO(SL): make it optional
  eventTarget: CustomEventTarget<DataFrameEvents>
}
