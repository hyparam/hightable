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
 * A set of the names of the sortable columns. Used to check if a column is sortable, and to provide the toggle function in the OrderByContext.
 */
type SortableColumnsContextType = ReadonlySet<string>

export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
/**
 * The list of column names, in the order they are defined in the data frame.
 */
export const ColumnNamesContext = createContext<string[]>([])
export const SortableColumnsContext = createContext<SortableColumnsContextType>(new Set())
export const ExclusiveSortContext = createContext<boolean>(false)
export const DataFrameMethodsContext = createContext<DataFrameMethods>({
  getRowNumber: () => undefined,
  getCell: () => undefined,
})
// the data key is only used in tests
export const DataKeyContext = createContext<number>(0)
