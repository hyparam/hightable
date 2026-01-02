import { createContext } from 'react'

export interface ScrollModeContextType {
  scrollMode?: 'native' | 'virtual'
  canvasHeight?: number // total scrollable height
  sliceTop?: number // offset of the top of the slice from the top of the canvas
  onViewportChange?: (viewport: { clientHeight: number, scrollTop: number }) => void // function to call when the current viewport height and scroll top position change
  scrollRowIntoView?: ({ rowIndex }: { rowIndex: number }) => void // function to scroll so that the row is visible in the table
  setScrollToTop?: (scrollToTop: ((top: number) => void) | undefined) => void // function to set the scrollToTop function
}

export const defaultScrollModeContext: ScrollModeContextType = {}

export const ScrollModeContext = createContext<ScrollModeContextType>(defaultScrollModeContext)
