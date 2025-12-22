import { createContext } from 'react'

export interface ScrollModeContextType {
  scrollMode?: 'native' | 'virtual'
  shouldScrollHorizontally?: boolean
  setShouldScrollHorizontally?: (shouldScroll: boolean) => void
}

export const defaultScrollModeContext: ScrollModeContextType = {}

export const ScrollModeContext = createContext<ScrollModeContextType>(defaultScrollModeContext)
