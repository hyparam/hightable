import { type ReactNode, useCallback, useMemo, useReducer, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, rowHeight } from '../helpers/constants.js'

// 16,500px is ~0.2% of the canvas height for 8M px, it corresponds to 500 rows at 33px height.
// -> when scrolling with the mouse wheel, the change is local (< 16,500px)
// -> when scrolling with the scrollbar (drag/drop), or with the mouse wheel for a long time (> 500 rows), the change is global (> 0.2% of the scrollbar height)
// -> on mobile, swapping will also produce big jumps.
// TODO(SL): should we detect touch events and adapt the thresholds on mobile?
// TODO(SL): decrease/increase the threshold? make it configurable? or dependent on the number of rows, ie: a % of the scroll bar height?
const largeScrollPx = 16_500

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
  scrollTop: number | undefined
  virtualScrollBase: number | undefined
  virtualScrollDelta: number
}

type ScrollAction
  = | { type: 'SET_SCALE', scale: Scale }
    | { type: 'ON_SCROLL', scrollTop: number }
    | { type: 'SCROLL_TO', scrollTop: number, virtualScrollTop: number }
    | { type: 'ADD_DELTA', delta: number }

function scrollReducer(state: ScrollState, action: ScrollAction) {
  switch (action.type) {
    case 'SCROLL_TO':
      return {
        ...state,
        isScrolling: true,
        scrollTop: action.scrollTop,
        virtualScrollBase: action.virtualScrollTop,
        virtualScrollDelta: 0,
      }
    case 'ON_SCROLL': {
      const isScrolling = false
      const { scrollTop } = action

      // if virtualScrollBase is undefined, we initialize it here
      const { scale, virtualScrollDelta, virtualScrollBase, scrollTop: oldScrollTop } = state

      if (virtualScrollBase === undefined) {
        if (!scale) {
          // cannot compute virtualScrollBase without scale
          return {
            ...state,
            isScrolling,
            scrollTop,
          }
        }

        // initialize virtualScrollBase
        return {
          ...state,
          isScrolling,
          scrollTop,
          // we assume that virtualScrollDelta is valid (surely 0 at this point)
          virtualScrollBase: scale.toVirtual(scrollTop) - virtualScrollDelta,
        }
      }

      if (oldScrollTop === undefined) {
        // cannot compute a delta without oldScrollTop
        return {
          ...state,
          isScrolling,
          scrollTop,
        }
      }

      const delta = scrollTop - oldScrollTop

      // Do a global jump (reset local scroll based on the new scrollTop value) if
      if (
        // we can compute virtualScrollBase and one of the following conditions is met
        scale !== undefined && (
          // the last move is big
          Math.abs(delta) > largeScrollPx
          // the accumulated virtualScrollDelta is big
          || Math.abs(virtualScrollDelta + delta) > largeScrollPx
          // scrollTop is 0 - cannot scroll back up, we need to reset to the first row
          || scrollTop === 0
          // scrollTop is at the maximum - cannot scroll further down, we need to reset to the last row
          || scrollTop >= scale.canvasHeight - scale.clientHeight
        )
      ) {
        // reset virtualScrollBase and virtualScrollDelta
        return {
          ...state,
          isScrolling,
          scrollTop,
          virtualScrollBase: scale.toVirtual(Math.min(scrollTop, scale.canvasHeight - scale.clientHeight)),
          virtualScrollDelta: 0,
        }
      }

      // Adjust virtualScrollDelta
      return {
        ...state,
        isScrolling,
        scrollTop,
        virtualScrollDelta: virtualScrollDelta + delta,
      }
    }
    case 'ADD_DELTA':
      return {
        ...state,
        virtualScrollDelta: state.virtualScrollDelta + action.delta,
      }
    case 'SET_SCALE': {
      const { scale } = action
      const { virtualScrollBase, virtualScrollDelta, scrollTop } = state

      // initialize virtualScrollBase if needed and possible
      if (virtualScrollBase === undefined && scrollTop !== undefined) {
        return {
          ...state,
          scale,
          // we assume that virtualScrollDelta is valid (surely 0 at this point)
          virtualScrollBase: scale.toVirtual(scrollTop) - virtualScrollDelta,
        }
      }

      // TODO(SL): if state.scale already existed, i.e. if some dimensions changed, update the state accordingly (virtualScrollBase, virtualScrollDelta)
      // trying to keep the same view?
      // The most impactful change could be if the number of rows changed drastically.

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
  scrollTop: undefined,
  virtualScrollBase: undefined,
  virtualScrollDelta: 0,
}

export function ScrollModeVirtualProvider({ children, canvasHeight, headerHeight, numRows, padding }: ScrollModeVirtualProviderProps) {
  const [{ scale, scrollTop, virtualScrollBase, isScrolling, virtualScrollDelta }, dispatch] = useReducer(scrollReducer, initialScrollState)
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

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const virtualScrollTop = virtualScrollBase + virtualScrollDelta
    const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.clientHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      return
    }

    // partly or totally hidden: update the scroll position
    const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
    const newVirtualScrollDelta = virtualScrollDelta + delta
    if (
      Math.abs(newVirtualScrollDelta - virtualScrollDelta) > largeScrollPx
      || Math.abs(newVirtualScrollDelta) > largeScrollPx
    ) {
      // reset virtualScrollTop and scrollTop (coarse scroll)
      if (!scrollTo) {
        console.warn('scrollTo function is not available. Cannot scroll to row.')
        return
      }
      const newVirtualScrollTop = virtualScrollBase + newVirtualScrollDelta
      const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
      scrollTo({ top: newScrollTop, behavior: 'instant' })
      // anticipate the scroll position change
      dispatch({ type: 'SCROLL_TO', scrollTop: newScrollTop, virtualScrollTop: newVirtualScrollTop })
    } else {
      // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with virtualScrollDelta
      dispatch({ type: 'ADD_DELTA', delta })
    }
  }, [numRows, scrollTo, virtualScrollBase, virtualScrollDelta, scrollTop, headerHeight, scale])

  // Compute the derived values

  const virtualScrollTop = useMemo(() => {
    if (virtualScrollBase === undefined) {
      return undefined
    }
    return virtualScrollBase + virtualScrollDelta
  }, [virtualScrollBase, virtualScrollDelta])

  // special case: is the virtual scroll position in the header?
  const isInHeader = useMemo(() => {
    if (virtualScrollTop === undefined) {
      return undefined
    }
    return numRows === 0 || virtualScrollTop < headerHeight
  }, [numRows, virtualScrollTop, headerHeight])

  // a. first visible row. It can be the header row (0).
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

  // b. last visible row
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

  // Uncomment if needed
  // const hiddenPixelsAfter = headerHeight + (lastVisibleRow + 1) * rowHeight - (virtualScrollTop + scale.clientHeight)

  const visibleRowsStart = firstVisibleRow
  if (visibleRowsStart !== undefined && isNaN(visibleRowsStart)) throw new Error(`invalid start row ${visibleRowsStart}`)
  const visibleRowsEnd = lastVisibleRow === undefined ? undefined : lastVisibleRow + 1 // end is exclusive
  if (visibleRowsEnd !== undefined && isNaN(visibleRowsEnd)) throw new Error(`invalid end row ${visibleRowsEnd}`)
  if (visibleRowsEnd !== undefined && visibleRowsStart !== undefined && visibleRowsEnd - visibleRowsStart > 1000) throw new Error(`attempted to render too many rows ${visibleRowsEnd - visibleRowsStart}`)

  // e. offset of the first row in the canvas
  const renderedRowsStart = useMemo(() => visibleRowsStart === undefined ? undefined : Math.max(0, visibleRowsStart - padding), [visibleRowsStart, padding])
  const renderedRowsEnd = useMemo(() => visibleRowsEnd === undefined ? undefined : Math.min(numRows, visibleRowsEnd + padding), [visibleRowsEnd, numRows, padding])

  const sliceTop = useMemo(() => {
    if (visibleRowsStart === undefined || renderedRowsStart === undefined || isInHeader === undefined || hiddenPixelsBefore === undefined || scrollTop === undefined) {
      return undefined
    }
    // Y-offset of the first visible data row in the full scrollable canvas,
    // i.e. the scroll position minus the number of hidden pixels for that row.
    const firstVisibleRowTop = scrollTop - hiddenPixelsBefore
    // Number of "padding" rows that we render above the first visible row
    const previousPaddingRows = visibleRowsStart - renderedRowsStart
    // When the scroll position is still within the header, the first visible
    // data row starts right after the header. Encode that as 0/1 so we can
    // subtract a single headerHeight when we are in the body.
    const headerRow = isInHeader ? 0 : 1
    // The top of the rendered slice in canvas coordinates:
    // - start from the top of the first visible row
    // - subtract the header height (once) when we are below the header
    // - shift up by the number of padding rows times the row height so that
    //   those extra rows are also included in the rendered slice.
    return firstVisibleRowTop - headerRow * headerHeight - previousPaddingRows * rowHeight
  }, [visibleRowsStart, renderedRowsStart, isInHeader, headerHeight, scrollTop, hiddenPixelsBefore])

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
