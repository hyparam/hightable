import type { OrderBy } from '../sort.js'
import type { CustomEventTarget } from '../typedEventTarget.js'

export type Obj = Record<string, any>

export type Cells = Obj

export interface ResolvedValue<T = any> {
  value: T
}

/**
 * Events emitted by DataFrame instances.
 */
export interface DataFrameEvents {
  /**
   * Emitted when the number of rows has changed.
   */
  'numrowschange': undefined;
  /**
   * Emitted when a cell value has resolved.
   */
  'resolve': undefined;
  /**
   * Emitted when some data has been updated (e.g. a cell value).
   */
  'update': undefined;
}

export interface ColumnDescriptor<C extends Obj = Obj> {
  name: string; // column name
  sortable?: boolean; // is the column sortable? Defaults to false
  metadata?: C // custom metadata extendable by the user
}

export type Fetch = ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void>

/**
 * DataFrame is an interface for a data structure that represents a table of unmutable data.
 *
 * The data can be fetched in chunks, and the table can subscribe to changes using the eventTarget.
 *
 * The methods getCell, getRowNumber, and fetch should respect the columns' `sortable` property:
 * - sort along the sortable columns when `orderBy` is provided,
 * - throw an error if a column within `orderBy` is not sortable.
 */
export interface DataFrame<M extends Obj = Obj, C extends Obj = Obj> {
  // number of rows in the data frame
  // trigger a "numrowschange" event when it changes (can be implemented with a getter and a setter, emitting the event on set)
  // if numRows can change, be careful to take it into account in getCell, getRowNumber and fetch implementations,
  // for example when validating the row parameter.
  numRows: number
  // TODO(SL): rename back to header? (`columns` might be confusing as it's a parameter of the fetch method)
  columnDescriptors: ColumnDescriptor<C>[]
  metadata?: M

  // If true, only one column can be sorted at a time, and any update to orderBy will replace the previous one.
  // Defaults to false.
  exclusiveSort?: boolean

  // Returns the cell value.
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
  // rowEnd is exclusive
  //
  // For static data frames, fetch can be undefined.
  fetch?: Fetch

  // emits events, defined in DataFrameEvents
  //
  // listen to an event:
  // eventTarget.addEventListener('resolve', (event) => {
  //   console.log('A new cell has resolved')
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('resolve'))
  //
  // For static data frames, eventTarget can be undefined.
  eventTarget?: CustomEventTarget<DataFrameEvents>
}
