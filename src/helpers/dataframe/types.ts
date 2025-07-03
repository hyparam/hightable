import type { OrderBy } from '../sort.js'
import type { CustomEventTarget } from '../typedEventTarget.js'

export type Cells = Record<string, any>

export interface ResolvedValue<T = any> {
  value: T
}

export interface DataFrameEvents {
  'resolve': undefined;
}

/**
 * UnsortableDataFrame is an interface for a data structure that represents a table of unmutable data.
 *
 * The data can be fetched in chunks, and the table can subscribe to changes using the eventTarget.
 *
 * The data frame does not support sorting, and the `sortable` property is set to false.
 */
export interface UnsortableDataFrame {
  numRows: number
  header: string[]
  sortable?: false

  getCell({ row, column }: {row: number, column: string}): ResolvedValue | undefined

  getRowNumber({ row }: {
    row: number, // row index in the dataframe
  }): ResolvedValue<number> | undefined

  fetch: ({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns?: string[], signal?: AbortSignal }) => Promise<void>

  eventTarget?: CustomEventTarget<DataFrameEvents>
}

/**
 * SortableDataFrame is an interface for a data structure that represents a table of unmutable data.
 *
 * The data can be fetched in chunks, and the table can subscribe to changes using the eventTarget.
 *
 * It can be sorted.
 */
export interface SortableDataFrame extends Omit<UnsortableDataFrame, 'sortable'> {
  sortable: true

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined

  // Return the row number (index in the underlying data) for the given row index in the dataframe.
  // undefined if the row number is not available yet.
  // If the dataframe is the result of a sampling operation, for example, the row number is the index in
  // the original data.
  getRowNumber({ row, orderBy }: {
    row: number, // row index in the dataframe
    orderBy?: OrderBy
  }): ResolvedValue<number> | undefined

  // Checks if the required data (the required columns, which can be undefined or an empty array, and the row numbers) is available,
  // and it not, it fetches it.
  // The method is asynchronous and resolves when all the data has been fetch.
  //
  // The table can use an AbortController and pass its .signal, to be able to cancel with .abort() when a user scrolls out of view.
  // The dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  //
  // It rejects on the first error, which can be the signal abort (it must throw `AbortError`).
  //
  // It's responsible for dispatching the "resolve" event when data has resolved
  // (ie: when some new data is available synchronously with the methods `getCell` and `getRowNumber`).
  // It can dispatch the events multiple times if the data is fetched in chunks.
  //
  // Note that it does not return the data.
  //
  // static data frames can return a Promise that resolves immediately.
  // rowEnd is exclusive
  fetch: ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void>

  // emits events, defined in DataFrameEvents
  //
  // listen to an event:
  // eventTarget.addEventListener('resolve', (event) => {
  //   console.log('A new cell has resolved')
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('resolve'))
  eventTarget: CustomEventTarget<DataFrameEvents>
}

/**
 * DataFrame is an interface for a data structure that represents a table of unmutable data.
 *
 * The data can be fetched in chunks, and the table can subscribe to changes using the eventTarget.
 *
 * It can be sorted or unsorted, see the `sortable` property.
 */
export type DataFrame = SortableDataFrame | UnsortableDataFrame
