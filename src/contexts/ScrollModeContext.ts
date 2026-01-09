import { createContext } from 'react'

interface RowsRange {
  start: number // first row index (inclusive). Indexes refer to the virtual table domain.
  end: number // last row index (exclusive)
}

export interface ScrollModeContextType {
  scrollMode?: 'native' | 'virtual'
  canvasHeight?: number // total scrollable height
  sliceTop?: number // offset of the top of the slice from the top of the canvas
  renderedRowsRange?: RowsRange // range of rows rendered in the DOM as table rows (including padding rows)
  visibleRowsRange?: RowsRange // range of rows visible in the viewport
  scrollRowIntoView?: ({ rowIndex }: { rowIndex: number }) => void // function to scroll so that the row is visible in the table
  setClientHeight?: (clientHeight: number) => void // function to call when the current viewport height changes
  setScrollTo?: (scrollTo: HTMLElement['scrollTo'] | undefined) => void // function to set the scrollTo function
  setScrollTop?: (scrollTop: number) => void // function to call when the current scroll top position changes
}

export const defaultScrollModeContext: ScrollModeContextType = {}

export const ScrollModeContext = createContext<ScrollModeContextType>(defaultScrollModeContext)
