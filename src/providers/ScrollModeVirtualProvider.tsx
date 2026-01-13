import { type ReactNode, useCallback, useMemo, useReducer, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, largeScrollPx, rowHeight } from '../helpers/constants.js'
import { computeDerivedValues, createScale, initializeScrollState, scrollReducer } from '../helpers/virtualScroll.js'

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
    if (rowIndex < 1 || rowIndex > numRows + 1 || !Number.isInteger(rowIndex)) {
      throw new Error(`Invalid row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 1}.`)
    }
    if (!scale || virtualScrollBase === undefined || scrollTop === undefined) {
      return
    }

    if (rowIndex === 1) {
      // header row
      return
    }

    const row = rowIndex - ariaOffset // convert to 0-based data row index

    // TODO(SL): move this logic to the virtualScroll helper

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const virtualScrollTop = virtualScrollBase + virtualScrollDelta
    const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.parameters.clientHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      return
    }
    // else, it's partly or totally hidden: update the scroll position

    const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
    if (
      scrollTo && (
        // big jump
        Math.abs(delta) > largeScrollPx
        // or accumulated delta is big
        || Math.abs(virtualScrollDelta + delta) > largeScrollPx
      )
    ) {
      // scroll to the new position, and update the state optimistically
      const newVirtualScrollTop = virtualScrollTop + delta
      const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
      // side effect: scroll the viewport
      scrollTo({ top: newScrollTop, behavior: 'instant' })
      // anticipate the scroll position change
      dispatch({ type: 'SCROLL_TO', scrollTop: newScrollTop })
    } else {
      // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with virtualScrollDelta
      dispatch({ type: 'ADD_DELTA', delta })
    }
  }, [numRows, scrollTo, virtualScrollBase, virtualScrollDelta, scrollTop, headerHeight, scale])

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
