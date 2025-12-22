import { createContext } from 'react'

export interface RowsRange {
  start: number
  end: number
}

type RowsRangeContextType = RowsRange | undefined

export const defaultRowsRangeContext: RowsRangeContextType = undefined

export const RowsRangeContext = createContext<RowsRangeContextType>(defaultRowsRangeContext)
