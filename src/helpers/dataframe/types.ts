import type { OrderBy } from '../sort.js'
import type { CustomEventTarget } from '../typedEventTarget.js'

export type Obj = Record<string, any>

export type Cells = Obj

/**
 * A resolved value wrapping the actual value.
 */
export interface ResolvedValue<T = any> {
  /** The actual value. Can be undefined. */
  value: T
}

/**
 * Events emitted by DataFrame instances.
 */
export interface DataFrameEvents {
  /**
   * Emitted when the number of rows has changed.
   */
  numrowschange: undefined
  /**
   * Emitted when a cell value has resolved.
   */
  resolve: undefined
  /**
   * Emitted when some data has been updated (e.g. a cell value).
   */
  update: undefined
}

/**
 * Descriptor for a single column in a DataFrame.
 */
export interface ColumnDescriptor<C extends Obj = Obj> {
  /** Column name */
  name: string
  /** Whether the column is sortable. Defaults to false. */
  sortable?: boolean
  /** Custom metadata extendable by the user */
  metadata?: C
}

export type Fetch = ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void>

// TODO(SL): here, we mention "immutable data", but we have an event "update" in DataFrameEvents. Clarify.

/**
 * DataFrame is an interface for a data structure that represents a table of immutable data.
 *
 * The data can be fetched in chunks, and the table can subscribe to changes using the eventTarget.
 *
 * The methods getCell, getRowNumber, and fetch should respect the columns' `sortable` property:
 * - sort along the sortable columns when `orderBy` is provided,
 * - throw an error if a column within `orderBy` is not sortable.
 */
export interface DataFrame<M extends Obj = Obj, C extends Obj = Obj> {
  /** Number of rows in the data frame.
   *
   * Trigger a "numrowschange" event when it changes (can be implemented with a getter and a setter, emitting the event on set).
   *
   * If numRows can change, be careful to take it into account in getCell, getRowNumber and fetch implementations,
   * for example when validating the row parameter.
   */
  numRows: number
  /**
   * Descriptors for all columns in the data frame, in order.
   *
   * Includes the column name, whether it's sortable, and any custom metadata.
   */
  // TODO(SL): rename back to header? (`columns` might be confusing as it's a parameter of the fetch method)
  columnDescriptors: ColumnDescriptor<C>[]
  /** Custom metadata about the data frame */
  metadata?: M

  /**
   * If false, multiple columns can be sorted at the same time, and orderBy is treated as a list of sort criteria.
   *
   * If true, only one column can be sorted at a time, and any update to orderBy will replace the previous one.
   *
   * Defaults to false.
   */
  exclusiveSort?: boolean

  /**
   * Get the value of a cell at the given row and column, optionally sorted by orderBy.
   *
   * getCell does NOT initiate a fetch, it just returns resolved data.
   *
   * @param row - The row index in the data frame (0 = first row).
   * @param column - The column name.
   * @param orderBy - Optional sorting criteria.
   * @returns The resolved cell value (a boxed value type, so we can distinguish undefined from pending), or undefined if the value is not available yet.
   */
  getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined

  /**
   * Get the row number (index in the underlying data) for the given row index in the dataframe.
   *
   * getRowNumber does NOT initiate a fetch, it just returns resolved data.
   *
   * The result can be different from the row parameter when the dataframe is the result of a sampling operation,
   * a filter, a sort, or any operation that changes the order or the set of rows. In the case of a sampling operation, for example, the row number is the index in the original data.
   *
   * @param row - The row index in the data frame (0 = first row).
   * @param orderBy - Optional sorting criteria.
   * @returns The resolved row number (a boxed value type, by analogy to getCell), or undefined if the value is not available yet.
   */
  getRowNumber({ row, orderBy }: {
    row: number // row index in the dataframe
    orderBy?: OrderBy
  }): ResolvedValue<number> | undefined

  /**
   * Fetch the required data (the required columns and the row numbers) asynchronously.
   *
   * This method is optional, as static data frames might not need to fetch any data.
   *
   * Checks if the required data (the required columns and the row numbers) is available,
   * and it not, it fetches it.
   *
   * The client can use an AbortController and pass its .signal, to be able to cancel with .abort() when the data is not required anymore.
   * The dataframe implementer can choose to ignore, de-queue, or cancel in-flight fetches.
   *
   * It rejects on the first error, which can be the signal abort (it must throw `AbortError`).
   *
   * It's responsible for dispatching the "resolve" event when data has resolved
   * (ie: when some new data is available synchronously with the methods `getCell` and `getRowNumber`).
   * It can dispatch the events multiple times if the data is fetched in chunks.
   *
   * @param rowStart - The start row index (inclusive, 0 = first row).
   * @param rowEnd - The end row index (exclusive).
   * @param columns - The list of column names to fetch. If undefined or an empty array, only the row numbers must be fetched.
   * @param orderBy - Optional sorting criteria.
   * @param signal - Optional AbortSignal to cancel the fetch.
   * @returns A void promise which resolves when all the data has been fetched. Note that it does not return the data.
   */
  fetch?: Fetch

  /**
   * Event target to subscribe to DataFrame events.
   *
   * If the DataFrame is static and does not emit events, this can be undefined.
   *
   * See DataFrameEvents for the list of events.
   *
   * To listen to events, use eventTarget.addEventListener('eventname', callback).
   * To emit events, use eventTarget.dispatchEvent(new CustomEvent('eventname')).
   */
  eventTarget?: CustomEventTarget<DataFrameEvents>
}
