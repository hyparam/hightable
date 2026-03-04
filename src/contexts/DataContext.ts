import { createContext, useContext } from 'react'

import type { ColumnDescriptor, DataFrame } from '../helpers/dataframe/types.js'

export type DataFrameMethods = Pick<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>
export type DataFrameWithoutMethods = Omit<DataFrame, 'getRowNumber' | 'getCell' | 'fetch'>

export const DataKeyContext = createContext<number>(0)
export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
export const ColumnDescriptorsContext = createContext<Pick<ColumnDescriptor, 'name' | 'sortable'>[]>([])
export const NumColumnsContext = createContext<number>(0)
export const ExclusiveSortContext = createContext<boolean>(false)
export const DataContext = createContext<DataFrameMethods | undefined>(undefined)

// the data key is only used in tests
export function useDataKey() {
  return useContext(DataKeyContext)
}

export function useDataVersion() {
  return useContext(DataVersionContext)
}

export function useNumRows() {
  return useContext(NumRowsContext)
}

export function useColumnDescriptors() {
  return useContext(ColumnDescriptorsContext)
}

export function useNumColumns() {
  return useContext(NumColumnsContext)
}

export function useExclusiveSort() {
  return useContext(ExclusiveSortContext)
}

export function useData(): DataFrameMethods {
  const data = useContext(DataContext)
  if (data === undefined) {
    throw new Error('useData must be used within a DataContext.Provider with a valid DataFrameMethods value')
  }
  return data
}
