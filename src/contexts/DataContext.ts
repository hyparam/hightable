import { createContext, useContext } from 'react'

export type ColumnDescriptorContextValue = { name: string; sortable?: boolean }

export const DataKeyContext = createContext<number>(0)
export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
export const ColumnDescriptorsContext = createContext<ColumnDescriptorContextValue[]>([])
export const NumColumnsContext = createContext<number>(0)

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
