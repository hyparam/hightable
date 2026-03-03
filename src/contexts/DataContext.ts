import { createContext, useContext } from 'react'

export const DataKeyContext = createContext<number>(0)
export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)
export const NumColumnsContext = createContext<number>(0)

// only used in tests
export function useDataKey() {
  return useContext(DataKeyContext)
}

export function useDataVersion() {
  return useContext(DataVersionContext)
}

export function useNumRows() {
  return useContext(NumRowsContext)
}

export function useNumColumns() {
  return useContext(NumColumnsContext)
}
