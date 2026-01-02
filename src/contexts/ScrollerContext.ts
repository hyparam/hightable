import { createContext } from 'react'

interface ScrollerContextType {
  scrollRowIntoView?: ({ rowIndex }: { rowIndex: number }) => void // function to scroll so that the row is visible in the table
}

export const defaultScrollerContext: ScrollerContextType = {}

export const ScrollerContext = createContext<ScrollerContextType>(defaultScrollerContext)
