import { createContext } from 'react'

export interface ScrollModeContextType {
  scrollMode?: 'native' | 'virtual'
  scrollRowIntoView?: ({ rowIndex }: { rowIndex: number }) => void // function to scroll so that the row is visible in the table
}

export const defaultScrollModeContext: ScrollModeContextType = {}

export const ScrollModeContext = createContext<ScrollModeContextType>(defaultScrollModeContext)
