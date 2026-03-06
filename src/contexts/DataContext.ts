import { createContext } from 'react'

import type { ColumnDescriptor, DataFrame } from '../helpers/dataframe/types.js'

/**
 * The data frame, limited to the getRowNumber, getCell, and fetch methods.
 *
 * The methods might change over time, without the data frame instance changing.
 */
export type DataFrameMethods = Pick<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>
export type DataFrameWithoutMethods = Omit<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>

export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
export const ColumnDescriptorsContext = createContext<Pick<ColumnDescriptor, 'name' | 'sortable'>[]>([])
export const NumColumnsContext = createContext<number>(0)
export const ExclusiveSortContext = createContext<boolean>(false)
export const DataFrameMethodsContext = createContext<DataFrameMethods>({
  getRowNumber: () => undefined,
  getCell: () => undefined,
})
// the data key is only used in tests
export const DataKeyContext = createContext<number>(0)
