import type { OrderBy } from '../sort.js'

export type Obj = Record<string, any>

export type Cells = Obj

export interface ResolvedValue<T = any> {
  value: T
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
  numRows: number
  // TODO(SL): rename back to header? (`columns` might be confusing as it's a parameter of the fetch method)
  columnDescriptors: readonly ColumnDescriptor<C>[]
  metadata?: M

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
  // Note that it does not return the data.
  //
  // rowEnd is exclusive
  //
  // For static data frames, fetch can be undefined.
  fetch?: Fetch

  // Optional cache listener for dataframes that support caching
  registerCellListener?: (callback: () => void) => () => void
}
