import { createContext } from 'react'

export interface ScrollModeContextType {
  scrollMode?: 'native' | 'virtual'
  canvasHeight?: number // total scrollable height
  sliceTop?: number // offset of the top of the slice from the top of the canvas
  visibleRowsStart?: number // index of the first row visible in the viewport (inclusive). Indexes refer to the virtual table domain.
  visibleRowsEnd?: number // index of the last row visible in the viewport (exclusive).
  renderedRowsStart?: number // index of the first row rendered in the DOM as a table row (inclusive).
  renderedRowsEnd?: number // index of the last row rendered in the DOM as a table row (exclusive).
  scrollRowIntoView?: ({ rowIndex }: { rowIndex: number }) => void // function to scroll so that the row is visible in the table
  setClientHeight?: (clientHeight: number) => void // function to call when the current viewport height changes
  setScrollTo?: (scrollTo: HTMLElement['scrollTo'] | undefined) => void // function to set the scrollTo function
  setScrollTop?: (scrollTop: number) => void // function to call when the current scroll top position changes
}

export const defaultScrollModeContext: ScrollModeContextType = {}

export const ScrollModeContext = createContext<ScrollModeContextType>(defaultScrollModeContext)
