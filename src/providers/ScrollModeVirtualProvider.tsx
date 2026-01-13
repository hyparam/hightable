import { type ReactNode, useCallback, useMemo, useReducer, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { rowHeight } from '../helpers/constants.js'
import { computeDerivedValues, createScale, getScrollActionForRow, initializeScrollState, scrollReducer } from '../helpers/virtualScroll.js'

interface ScrollModeVirtualProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
  headerHeight: number
  numRows: number
  padding: number
}

export function ScrollModeVirtualProvider({ children, canvasHeight, headerHeight, numRows, padding }: ScrollModeVirtualProviderProps) {
  const [{ scale, scrollTop, virtualScrollBase, isScrolling, virtualScrollDelta }, dispatch] = useReducer(scrollReducer, undefined, initializeScrollState)
  const [scrollTo, setScrollTo] = useState<HTMLElement['scrollTo'] | undefined>(undefined)
  const setScrollTop = useCallback((scrollTop: number) => {
    dispatch({ type: 'ON_SCROLL', scrollTop })
  }, [])
  const [clientHeight, _setClientHeight] = useState<number | undefined>(undefined)
  const setClientHeight = useCallback((clientHeight: number) => {
    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // instead, it should return without updating the visible rows range, or set it to undefined.
    // TODO(SL): test in the browser (playwright)
    _setClientHeight(clientHeight === 0 ? 100 : clientHeight)
  }, [])

  const currentScale = useMemo(() => {
    if (clientHeight === undefined) {
      return undefined
    }
    return createScale({ clientHeight, canvasHeight, headerHeight, rowHeight, numRows })
  }, [clientHeight, canvasHeight, headerHeight, numRows])

  // ideally: call SET_SCALE from an event listener (if num_rows changes, or on resize if clientHeight or headerHeight change)
  // not during rendering
  if (currentScale && currentScale !== scale) {
    dispatch({ type: 'SET_SCALE', scale: currentScale })
  }

  /**
   * Programmatically scroll to a specific row if needed.
   * Beware:
   * - row 1: header
   * - row 2: first data row
   * - row numRows + 1: last data row
   * @param rowIndex The row to scroll to (same semantic as aria-rowindex: 1-based, includes header)
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (!scale || virtualScrollBase === undefined) {
      return
    }
    const result = getScrollActionForRow({ rowIndex, scale, virtualScrollBase, virtualScrollDelta })
    if (!result) {
      return
    }
    if ('delta' in result) {
      dispatch({ type: 'ADD_DELTA', delta: result.delta })
    } else if ('scrollTop' in result && scrollTo) {
      // side effect: scroll the viewport
      scrollTo({ top: result.scrollTop, behavior: 'instant' })
      // anticipate the scroll position change
      dispatch({ type: 'SCROLL_TO', scrollTop: result.scrollTop })
    }
  }, [scrollTo, virtualScrollBase, virtualScrollDelta, scale])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight,
      isScrolling,
      setClientHeight,
      setScrollTop,
      scrollRowIntoView,
      setScrollTo,
      ...computeDerivedValues({
        scale,
        scrollTop,
        virtualScrollBase,
        virtualScrollDelta,
        padding,
      }),
    }
  }, [scale, scrollTop, virtualScrollBase, virtualScrollDelta, padding, canvasHeight, isScrolling, setClientHeight, setScrollTop, scrollRowIntoView])
  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
