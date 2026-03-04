import { createContext, useContext } from 'react'

import type { ColumnDescriptor } from '../helpers/dataframe/types.js'

export const DataKeyContext = createContext<number>(0)
export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
export const ColumnDescriptorsContext = createContext<Pick<ColumnDescriptor, 'name' | 'sortable'>[]>([])
export const NumColumnsContext = createContext<number>(0)
export const ExclusiveSortContext = createContext<boolean>(false)

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
