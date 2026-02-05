import { createContext } from 'react'

export interface ScrollContextType {
  /** Total scrollable height, in pixels */
  canvasHeight?: number
  /** Offset of the top of the visible slice from the top of the canvas, in pixels */
  sliceTop?: number
  /** Index of the first row visible in the viewport (inclusive). Indexes refer to the virtual table domain. */
  visibleRowsStart?: number
  /** Index of the last row visible in the viewport (exclusive). */
  visibleRowsEnd?: number
  /** Index of the first row rendered in the DOM as a table row (inclusive). */
  renderedRowsStart?: number
  /** Index of the last row rendered in the DOM as a table row (exclusive). */
  renderedRowsEnd?: number
  /**
   * Function to call when the current viewport height changes (on resize)
   *
   * @param clientHeight The new viewport height in pixels
   */
  setClientHeight?: (clientHeight: number) => void
  /**
   * Function to set the scrollTo function
   *
   * @param scrollTo The scrollTo function of the viewport element (on component mount), or undefined (on unmount)
   */
  setScrollTo?: (scrollTo: HTMLElement['scrollTo'] | undefined) => void
  /**
   * Function to call when the current scroll top position changes (on scroll)
   *
   * @param scrollTop The new scroll top position in pixels
   */
  setScrollTop?: (scrollTop: number) => void
}

export const defaultScrollContext: ScrollContextType = {}

export const ScrollContext = createContext<ScrollContextType>(defaultScrollContext)
