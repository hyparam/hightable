import { type ReactNode, useCallback, useMemo, useReducer, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, rowHeight } from '../helpers/constants.js'

// 4,000px is only 0.05% of the canvas height for 8 million rows
// -> when scrolling with the mouse wheel, the change is local (< 4,000px)
// -> when scrolling with the scrollbar (drag/drop), the change is global (> 0.05% of the scrollbar height)
// -> on mobile, swapping will also produce big jumps. TODO(SL): should we detect touch events and adapt the thresholds?
const coarseScrollThresholdPx = 4000
// 1px is only to avoid floating point precision issues (scrollTop is not always an integer)
const fineScrollThresholdPx = 1

interface ScrollModeVirtualProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
  headerHeight: number
  numRows: number
  padding: number
}

interface Scale {
  toVirtual: (scrollTop: number) => number
  fromVirtual: (virtualScrollTop: number) => number
  factor: number
  canvasHeight: number
  virtualCanvasHeight: number
  clientHeight: number
}

interface ScrollState {
  isScrolling: boolean
  scale: Scale | undefined
  scrollDelta: number
  scrollTop: number | undefined
  virtualScrollTop: number | undefined
}

type ScrollAction
  = | { type: 'ON_SCROLL', scrollTop: number }
    | { type: 'ADJUST_SCROLL_DELTA', scrollDelta: number }
    | { type: 'SCROLL_TO', scrollTop: number, virtualScrollTop: number }
    | { type: 'SET_SCALE', scale: Scale }

// TODO(SL): move logic to the reducer, using the scale + add tests
// TODO(SL): handle edge cases (scrollTop = 0 but first row is not 0 -> cannot scroll back)
// TODO(SL): lift this state up, above all the providers?
// Note that scrollTop can be negative, or beyond canvasHeight - clientHeight, depending on the browser,
// the zoom level, the scroll behavior or the margin/padding of the container.
// TODO(SL): handle these cases
function scrollReducer(state: ScrollState, action: ScrollAction) {
  switch (action.type) {
    case 'SCROLL_TO':
      return {
        ...state,
        scrollTop: action.scrollTop,
        virtualScrollTop: action.virtualScrollTop,
        scrollDelta: 0,
        isScrolling: true,
      }
    case 'ON_SCROLL': {
      const isScrolling = false
      const { scrollTop } = action

      // if virtualScrollTop is undefined, we initialize it here
      const { scale, scrollDelta, virtualScrollTop, scrollTop: oldScrollTop } = state

      if (virtualScrollTop === undefined) {
        if (!scale) {
        // cannot compute virtualScrollTop without scale
          return {
            ...state,
            scrollTop,
            isScrolling,
          }
        }

        // initialize virtualScrollTop
        // we assume that scrollDelta is valid (surely 0 at this point)
        const initialVirtualScrollTop = scale.toVirtual(scrollTop) - scrollDelta
        return {
          ...state,
          virtualScrollTop: initialVirtualScrollTop,
          scrollTop,
          isScrolling,
        }
      }

      if (!oldScrollTop) {
        // cannot compute a delta without oldScrollTop
        return {
          ...state,
          scrollTop,
          isScrolling,
        }
      }

      const delta = scrollTop - oldScrollTop
      if (Math.abs(delta) < fineScrollThresholdPx || !scale) {
        // negligible change, do nothing
        // (or, if scale is undefined, cannot compute virtualScrollTop)
        return {
          ...state,
          scrollTop,
          isScrolling,
        }
      }

      // special case: if scrollTop is 0, the user will not be able to scroll back up!
      // in that case, we reset virtualScrollTop and scrollDelta
      if (Math.abs(delta) > coarseScrollThresholdPx || scrollTop === 0) {
        // big change, or special case: reset virtualScrollTop and scrollDelta
        return {
          ...state,
          virtualScrollTop: scale.toVirtual(scrollTop),
          scrollTop,
          scrollDelta: 0,
          isScrolling,
        }
      }

      // small change, adjust scrollDelta
      return {
        ...state,
        scrollDelta: scrollDelta + delta,
        scrollTop,
        isScrolling,
      }
      // TODO(SL): adjust at the end to avoid white space after the last row
    }
    case 'ADJUST_SCROLL_DELTA':
      return {
        ...state,
        scrollDelta: action.scrollDelta,
      }
    case 'SET_SCALE': {
      const { scale } = action
      const { virtualScrollTop, scrollDelta, scrollTop } = state

      // initialize virtualScrollTop if needed and possible
      if (virtualScrollTop === undefined && scrollTop !== undefined) {
        // we assume that scrollDelta is valid (surely 0 at this point)
        const initialVirtualScrollTop = scale.toVirtual(scrollTop) - scrollDelta
        return {
          ...state,
          scale,
          virtualScrollTop: initialVirtualScrollTop,
        }
      }

      // TODO(SL): if state.scale already existed, i.e. if some dimensions changed, update the state accordingly (virtualScrollTop, scrollDelta)
      // trying to keep the same view

      return {
        ...state,
        scale,
      }
    }
  }
}

const initialScrollState: ScrollState = {
  isScrolling: false,
  scale: undefined,
  scrollDelta: 0,
  scrollTop: undefined,
  virtualScrollTop: undefined,
}

export function ScrollModeVirtualProvider({ children, canvasHeight, headerHeight, numRows, padding }: ScrollModeVirtualProviderProps) {
  const [{ scale, scrollTop, virtualScrollTop: _virtualScrollTop, isScrolling, scrollDelta }, dispatch] = useReducer(scrollReducer, initialScrollState)
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
    const virtualCanvasHeight = headerHeight + numRows * rowHeight

    // safety checks
    if (headerHeight <= 0) {
      throw new Error(`Invalid headerHeight: ${headerHeight}. It should be a positive number.`)
    }
    if (canvasHeight <= 0) {
      throw new Error(`Invalid canvasHeight: ${canvasHeight}. It should be a positive number.`)
    }
    if (numRows < 0 || !Number.isInteger(numRows)) {
      throw new Error(`Invalid numRows: ${numRows}. It should be a non-negative integer.`)
    }
    if (clientHeight !== undefined && canvasHeight <= clientHeight) {
      throw new Error(`Invalid canvasHeight: ${canvasHeight} when clientHeight is ${clientHeight}. canvasHeight should be greater than clientHeight for virtual scrolling.`)
    }
    if (clientHeight !== undefined && virtualCanvasHeight <= clientHeight) {
      throw new Error(`Invalid virtualCanvasHeight: ${virtualCanvasHeight} when clientHeight is ${clientHeight}. virtualCanvasHeight should be greater than clientHeight for virtual scrolling.`)
    }

    if (clientHeight === undefined) {
      return undefined
    }
    const factor = (virtualCanvasHeight - clientHeight) / (canvasHeight - clientHeight)
    return {
      toVirtual: (scrollTop: number) => {
        return scrollTop * factor
      },
      fromVirtual: (virtualScrollTop: number) => {
        return virtualScrollTop / factor
      },
      factor,
      canvasHeight,
      virtualCanvasHeight,
      clientHeight,
    }
  }, [clientHeight, canvasHeight, headerHeight, numRows])

  // ideally: call SET_SCALE from an event listener (if num_rows changes, or on resize if clientHeight or headerHeight change)
  // not during rendering
  if (currentScale && currentScale !== scale) {
    dispatch({ type: 'SET_SCALE', scale: currentScale })
  }

  const virtualScrollTop = useMemo(() => {
    if (_virtualScrollTop === undefined) {
      return undefined
    }
    return _virtualScrollTop + scrollDelta
  }, [_virtualScrollTop, scrollDelta])

  // Compute the derived values

  // special cases
  const isInHeader = useMemo(() => {
    if (virtualScrollTop === undefined) {
      return undefined
    }
    return numRows === 0 || virtualScrollTop < headerHeight
  }, [numRows, virtualScrollTop, headerHeight])

  // a. first visible row (r, d). It can be the header row (0).
  const firstVisibleRow = useMemo(() => {
    if (virtualScrollTop === undefined || isInHeader === undefined) {
      return undefined
    }
    return isInHeader
      ? 0
      : Math.max(0,
          Math.min(numRows - 1,
            Math.floor((virtualScrollTop - headerHeight) / rowHeight)
          )
        )
  }, [isInHeader, virtualScrollTop, headerHeight, numRows])

  // hidden pixels in the first visible row, or header
  const hiddenPixelsBefore = useMemo(() => {
    if (virtualScrollTop === undefined || isInHeader === undefined || firstVisibleRow === undefined) {
      return undefined
    }
    return isInHeader
      ? virtualScrollTop
      : virtualScrollTop - headerHeight - firstVisibleRow * rowHeight
  }, [isInHeader, virtualScrollTop, headerHeight, firstVisibleRow])

  // b. last visible row (s, e)
  const lastVisibleRow = useMemo(() => {
    if (scale === undefined || virtualScrollTop === undefined || firstVisibleRow === undefined) {
      return firstVisibleRow
    }
    return Math.max(firstVisibleRow,
      Math.min(numRows - 1,
        Math.floor((virtualScrollTop + scale.clientHeight - headerHeight) / rowHeight)
      )
    )
  }, [firstVisibleRow, numRows, virtualScrollTop, scale, headerHeight])

  // const hiddenPixelsAfter = headerHeight + (lastVisibleRow + 1) * rowHeight - (virtualScrollTop + scale.clientHeight)

  const visibleRowsStart = firstVisibleRow
  if (visibleRowsStart !== undefined && isNaN(visibleRowsStart)) throw new Error(`invalid start row ${visibleRowsStart}`)
  const visibleRowsEnd = lastVisibleRow === undefined ? undefined : lastVisibleRow + 1 // end is exclusive
  if (visibleRowsEnd !== undefined && isNaN(visibleRowsEnd)) throw new Error(`invalid end row ${visibleRowsEnd}`)
  if (visibleRowsEnd !== undefined && visibleRowsStart !== undefined && visibleRowsEnd - visibleRowsStart > 1000) throw new Error(`attempted to render too many rows ${visibleRowsEnd - visibleRowsStart}`)

  // e. offset of the first row in the canvas (u)
  const renderedRowsStart = useMemo(() => visibleRowsStart === undefined ? undefined : Math.max(0, visibleRowsStart - padding), [visibleRowsStart, padding])
  const renderedRowsEnd = useMemo(() => visibleRowsEnd === undefined ? undefined : Math.min(numRows, visibleRowsEnd + padding), [visibleRowsEnd, numRows, padding])

  const sliceTop = useMemo(() => {
    if (visibleRowsStart === undefined || renderedRowsStart === undefined || isInHeader === undefined || hiddenPixelsBefore === undefined || scrollTop === undefined) {
      return undefined
    }
    const firstVisibleRowTop = scrollTop - hiddenPixelsBefore
    const previousPaddingRows = visibleRowsStart - renderedRowsStart
    const headerRow = isInHeader ? 0 : 1
    return firstVisibleRowTop - headerRow * headerHeight - previousPaddingRows * rowHeight
  }, [visibleRowsStart, renderedRowsStart, isInHeader, headerHeight, scrollTop, hiddenPixelsBefore])

  /**
   * Programmatically scroll to a specific row if needed.
   * Beware:
   * - row 1: header
   * - row 2: first data row
   * - row numRows + 1: last data row
   * @param row The row to scroll to (same semantic as aria-rowindex: 1-based, includes header)
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (rowIndex < 1 || rowIndex > numRows + 1 || !Number.isInteger(rowIndex)) {
      throw new Error(`Invalid row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 1}.`)
    }
    if (!scale || _virtualScrollTop === undefined || scrollTop === undefined) {
      return
    }

    if (rowIndex === 1) {
      // header row
      return
    }

    const row = rowIndex - ariaOffset // convert to 0-based data row index

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const virtualScrollTop = _virtualScrollTop + scrollDelta
    const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.clientHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      return
    }

    // partly or totally hidden: update the scroll position
    const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
    const newScrollDelta = scrollDelta + delta
    if (
      Math.abs(newScrollDelta - scrollDelta) > coarseScrollThresholdPx
      || Math.abs(newScrollDelta) > coarseScrollThresholdPx
    ) {
      // reset virtualScrollTop and scrollTop (coarse scroll)
      if (!scrollTo) {
        console.warn('scrollTo function is not available. Cannot scroll to row.')
        return
      }
      const newVirtualScrollTop = _virtualScrollTop + newScrollDelta
      const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
      scrollTo({ top: newScrollTop, behavior: 'instant' })
      // anticipate the scroll position change
      dispatch({ type: 'SCROLL_TO', scrollTop: newScrollTop, virtualScrollTop: newVirtualScrollTop })
    } else if (Math.abs(newScrollDelta - scrollDelta) > fineScrollThresholdPx) {
      // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with scrollDelta
      dispatch({ type: 'ADJUST_SCROLL_DELTA', scrollDelta: newScrollDelta })
    }
  }, [numRows, scrollTo, _virtualScrollTop, scrollDelta, scrollTop, headerHeight, scale])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight,
      sliceTop,
      isScrolling,
      visibleRowsStart,
      visibleRowsEnd,
      renderedRowsStart,
      renderedRowsEnd,
      setClientHeight,
      setScrollTop,
      scrollRowIntoView,
      setScrollTo,
    }
  }, [canvasHeight, renderedRowsEnd, renderedRowsStart, sliceTop, isScrolling, visibleRowsEnd, visibleRowsStart, setClientHeight, setScrollTop, scrollRowIntoView])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
