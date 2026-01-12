import { type ReactNode, useCallback, useMemo, useState } from 'react'

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

export function ScrollModeVirtualProvider({ children, canvasHeight, headerHeight, numRows, padding }: ScrollModeVirtualProviderProps) {
  const [_virtualScrollTop, setVirtualScrollTop] = useState<number | undefined>(undefined)
  const [scrollTo, setScrollTo] = useState<HTMLElement['scrollTo'] | undefined>(undefined)
  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  const [scrollDelta, setScrollDelta] = useState<number>(0)
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const setScrollTopAndStopPendingScroll = useCallback((scrollTop: number) => {
    setIsScrolling(false)
    setScrollTop(scrollTop)
  }, [])
  const [clientHeight, _setClientHeight] = useState<number | undefined>(undefined)
  const setClientHeight = useCallback((clientHeight: number) => {
    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // instead, it should return without updating the visible rows range, or set it to undefined.
    // TODO(SL): test in the browser (playwright)
    _setClientHeight(clientHeight === 0 ? 100 : clientHeight)
  }, [])

  const virtualCanvasHeight = useMemo(() => headerHeight + numRows * rowHeight, [headerHeight, numRows])

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
  // Note that scrollTop can be negative, or beyond canvasHeight - clientHeight, depending on the browser,
  // the zoom level, the scroll behavior or the margin/padding of the container.
  // TODO(SL): handle these cases
  if (clientHeight !== undefined && canvasHeight <= clientHeight) {
    throw new Error(`Invalid canvasHeight: ${canvasHeight} when clientHeight is ${clientHeight}. canvasHeight should be greater than clientHeight for virtual scrolling.`)
  }
  if (clientHeight !== undefined && virtualCanvasHeight <= clientHeight) {
    throw new Error(`Invalid virtualCanvasHeight: ${virtualCanvasHeight} when clientHeight is ${clientHeight}. virtualCanvasHeight should be greater than clientHeight for virtual scrolling.`)
  }

  const scale = useMemo(() => {
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
    }
  }, [virtualCanvasHeight, clientHeight, canvasHeight])

  if (scale && scrollTop !== undefined) {
    if (_virtualScrollTop === undefined) {
      // initialize virtualScrollTop
      setVirtualScrollTop(scale.toVirtual(scrollTop))
      setScrollDelta(0)
    } else {
      // scrollTop has a limited precision (1px, or subpixel on some browsers) and is not predictable exactly, in particular when used with zooming.
      // The browser might also scroll slightly when focusing an element.
      // virtualScrollTop is decimal, computed for the virtual canvas, and updated by user action only when scrollTop changes significantly.
      const expectedScrollTop = scale.fromVirtual(_virtualScrollTop)
      const newScrollDelta = scrollTop - expectedScrollTop

      if (
        Math.abs(newScrollDelta - scrollDelta) > coarseScrollThresholdPx
        || Math.abs(newScrollDelta) > coarseScrollThresholdPx
      ) {
        // scrollTop changed significantly, or is too far from synchronization (too many small steps): update virtualScrollTop (coarse scroll)
        setVirtualScrollTop(scale.toVirtual(scrollTop))
        setScrollDelta(0)
      } else if (Math.abs(newScrollDelta - scrollDelta) > fineScrollThresholdPx) {
        // scrollTop changed slightly
        // keep scrollTop and virtualScrollTop untouched, compensate with scrollDelta
        setScrollDelta(newScrollDelta)
      }
      // else, change is negligible, do nothing
    }

    // TODO(SL): adjust at the end to avoid white space after the last row
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
    if (clientHeight === undefined || virtualScrollTop === undefined || firstVisibleRow === undefined) {
      return firstVisibleRow
    }
    return Math.max(firstVisibleRow,
      Math.min(numRows - 1,
        Math.floor((virtualScrollTop + clientHeight - headerHeight) / rowHeight)
      )
    )
  }, [firstVisibleRow, numRows, virtualScrollTop, clientHeight, headerHeight])

  // const hiddenPixelsAfter = headerHeight + (lastVisibleRow + 1) * rowHeight - (virtualScrollTop + clientHeight)

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
    if (!scale || clientHeight === undefined || _virtualScrollTop === undefined || scrollTop === undefined) {
      return
    }

    if (rowIndex === 1) {
      // header row
      setIsScrolling(false)
      return
    }

    const row = rowIndex - ariaOffset // convert to 0-based data row index

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const virtualScrollTop = _virtualScrollTop + scrollDelta
    const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - clientHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      setIsScrolling(false)
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
      setScrollTop(newScrollTop)
      setVirtualScrollTop(newVirtualScrollTop)
      setScrollDelta(0)
      setIsScrolling(true)
    } else if (Math.abs(newScrollDelta - scrollDelta) > fineScrollThresholdPx) {
      // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with scrollDelta
      setScrollDelta(newScrollDelta)
      setIsScrolling(false)
    } else {
      setIsScrolling(false)
    }
  }, [numRows, scrollTo, _virtualScrollTop, scrollDelta, scrollTop, headerHeight, clientHeight, scale])

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
      setScrollTop: setScrollTopAndStopPendingScroll, // if a programmatic scroll was triggered, we consider that it is done
      scrollRowIntoView,
      setScrollTo,
    }
  }, [canvasHeight, renderedRowsEnd, renderedRowsStart, sliceTop, isScrolling, visibleRowsEnd, visibleRowsStart, setClientHeight, setScrollTopAndStopPendingScroll, scrollRowIntoView])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
