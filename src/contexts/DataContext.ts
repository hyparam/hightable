import { createContext } from 'react'

import type { DataFrame } from '../helpers/dataframe/types.js'

/**
 * The data frame, limited to the getRowNumber, getCell, and fetch methods.
 *
 * The methods might change over time, without the data frame instance changing.
 */
export type DataFrameMethods = Pick<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>
export type DataFrameWithoutMethods = Omit<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>

/**
 * The version of the data frame (incremented on each update or resolve event).
 */
export const DataVersionContext = createContext<number>(0)
/**
 * The number of rows in the data frame.
 */
export const NumRowsContext = createContext<number>(0)
/**
 * The list of column names, in the order they are defined in the data frame column descriptors.
 */
export const ColumnNamesContext = createContext<readonly string[]>([])
/**
 * A set of the names of the sortable columns, used to check if a column is sortable.
 */
export const SortableColumnsContext = createContext<ReadonlySet<string>>(new Set())
/**
 * Whether the table is in exclusive sort mode, which means that only one column can be sorted at a time.
 */
export const ExclusiveSortContext = createContext<boolean>(false)
/**
 * The data frame methods (getRowNumber, getCell, and fetch) are provided together.
 * They might change over time with the context staying the same.
 */
export const DataFrameMethodsContext = createContext<DataFrameMethods>({
  getRowNumber: () => undefined,
  getCell: () => undefined,
})
/**
 * A stable key for the data instance, used in tests to check if the data frame has changed.
 */
export const DataKeyContext = createContext<number>(0)
