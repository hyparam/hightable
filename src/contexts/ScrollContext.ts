import type { Dispatch, SetStateAction } from 'react'
import { createContext } from 'react'

/**
 * Function to call when the current scroll top position changes (on scroll)
 *
 * @param scrollTop The new scroll top position in pixels
 */
export const SetScrollTopContext = createContext<((scrollTop: number) => void) | undefined>(undefined)

/**
 * Function to set the scrollTo function
 *
 * @param scrollTo The scrollTo function of the viewport element (on component mount), or undefined (on unmount)
 */
export const SetScrollToContext = createContext<Dispatch<SetStateAction<HTMLElement['scrollTo'] | undefined>> | undefined>(undefined)

/** Total scrollable height, in pixels */
export const CanvasHeightContext = createContext<number | undefined>(undefined)

/** Offset of the top of the visible slice from the top of the canvas, in pixels */
export const SliceTopContext = createContext<number | undefined>(undefined)

export const RenderedRowsContext = createContext<{
  /** Index of the first row rendered in the DOM as a table row (inclusive). */
  renderedRowsStart?: number
  /** Index of the last row rendered in the DOM as a table row (exclusive). */
  renderedRowsEnd?: number
}>({})
