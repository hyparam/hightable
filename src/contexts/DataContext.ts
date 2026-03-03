import { createContext, useContext } from 'react'

export const DataVersionContext = createContext<number>(0)
export const NumRowsContext = createContext<number>(0)

export function useDataVersion() {
  return useContext(DataVersionContext)
}

export function useNumRows() {
  return useContext(NumRowsContext)
}
