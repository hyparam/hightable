import { type ReactNode, useCallback, useMemo, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, rowHeight } from '../helpers/constants.js'

interface ScrollModeVirtualProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
  headerHeight: number
  numRows: number
  padding: number
}

export function ScrollModeVirtualProvider({ children, canvasHeight, headerHeight, numRows, padding }: ScrollModeVirtualProviderProps) {
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const [clientHeight, _setClientHeight] = useState<number | undefined>(undefined)
  const setClientHeight = useCallback((clientHeight: number) => {
    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // instead, it should return without updating the visible rows range, or set it to undefined.
    // TODO(SL): test in the browser (playwright)
    _setClientHeight(clientHeight === 0 ? 100 : clientHeight)
  }, [])

  const [virtualScrollTop, setVirtualScrollTop] = useState<number | undefined>(undefined)
  const [scrollTo, setScrollTo] = useState<HTMLElement['scrollTo'] | undefined>(undefined)
  const [shouldScrollHorizontally, setShouldScrollHorizontally] = useState(false)
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

  // convert scrollTop (in canvas coordinates, between 0px and canvasHeight - clientHeight)
  // to virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - clientHeight)
  const toVirtualScrollTop = useMemo(() => {
    if (clientHeight === undefined) {
      return undefined
    }
    return (scrollTop: number) => {
      return scrollTop * (virtualCanvasHeight - clientHeight) / (canvasHeight - clientHeight)
    }
  }, [virtualCanvasHeight, clientHeight, canvasHeight])

  // convert virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - clientHeight)
  // to scrollTop (in canvas coordinates, between 0px and canvasHeight - clientHeight)
  const toScrollTop = useMemo(() => {
    if (clientHeight === undefined) {
      return undefined
    }
    return (virtualScrollTop: number) => {
      return virtualScrollTop * (canvasHeight - clientHeight) / (virtualCanvasHeight - clientHeight)
    }
  }, [canvasHeight, clientHeight, virtualCanvasHeight])

  if (toScrollTop && toVirtualScrollTop && scrollTop !== undefined) {
    if (virtualScrollTop === undefined) {
      // initialize virtualScrollTop
      setVirtualScrollTop(toVirtualScrollTop(scrollTop))
    } else {
      // scrollTop has a limited precision (1px, or subpixel on some browsers) and is not predictable exactly, in particular when used with zooming.
      // The browser might also scroll slightly when focusing an element.
      // virtualScrollTop is decimal, computed for the virtual canvas, and updated by user action only when scrollTop changes significantly.
      const coarseScrollThreshold = 4000 // px. TODO(SL): how to choose the value? in percentage of clientHeight/canvasHeight? Generally, it's 33px or -33px (the height of the focused cell?)
      const fineScrollThreshold = 1
      const expectedScrollTop = toScrollTop(virtualScrollTop)
      const differencePx = scrollTop - expectedScrollTop

      if (Math.abs(differencePx) > coarseScrollThreshold) {
        // scrollTop changed significantly, it controls the position (coarse scroll)
        setVirtualScrollTop(toVirtualScrollTop(scrollTop))
      } else if (Math.abs(differencePx) > fineScrollThreshold) {
        // scrollTop changed slightly, adapt both scrollTop and virtualScrollTop
        // virtualScrollTop controls the position (fine scroll)
        // The difference is used to adjust virtualScrollTop accordingly
        const newVirtualScrollTop = virtualScrollTop + differencePx
        const newExpectedScrollTop = toScrollTop(newVirtualScrollTop)

        // set scrollTop to the precise value
        scrollTo?.({ top: newExpectedScrollTop, behavior: 'instant' })
        setVirtualScrollTop(newVirtualScrollTop)
        setScrollTop(newExpectedScrollTop)
        // should rerender with the new virtualScrollTop

        // TODO(SL): edge case: top boundary: we cannot come back to the first row if newExpectedScrollTop < 1 (effectively 0)
      }
      // else, change is negligible, do nothing
    }
  }

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
    if (!scrollTo) {
      console.warn('scrollTo function is not available. Cannot scroll to row.')
      return
    }
    if (!toScrollTop || clientHeight === undefined || virtualScrollTop === undefined) {
      return
    }

    if (rowIndex === 1) {
      // header row
      setShouldScrollHorizontally(true)
      return
    }

    const row = rowIndex - ariaOffset // convert to 0-based data row index

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - clientHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      setShouldScrollHorizontally(true)
      return
    }

    // partly or totally hidden: update the scroll position
    const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
    const newVirtualScrollTop = virtualScrollTop + delta

    // Update the virtual scroll top
    setVirtualScrollTop(newVirtualScrollTop)

    const tolerancePixels = 1

    const currentScrollTop = toScrollTop(virtualScrollTop)
    const newScrollTop = toScrollTop(newVirtualScrollTop)
    if (Math.abs(newScrollTop - currentScrollTop) > tolerancePixels) {
      // Ensure the new scrollTop is within bounds
      if (newScrollTop < 0 || newScrollTop > canvasHeight - clientHeight) {
        console.warn(`Computed scrollTop ${newScrollTop} is out of bounds (0, ${canvasHeight - clientHeight}). Cannot scroll to table row index: ${rowIndex}.`)
        return
      }

      // Update the coarse scroll position if the change is significant enough
      // for now, we ask for an instant scroll, there is no smooth scrolling
      // TODO(SL): if smooth scrolling is implemented, it might be async, so we should await it
      scrollTo({ top: newScrollTop, behavior: 'instant' })
    }

    // TODO(SL): replace with 'pendingScrollTo'... then set this state when next scroll event is received
    // Or: just pass "pendingScrollTo" to the context
    setShouldScrollHorizontally(true)
  }, [numRows, scrollTo, virtualScrollTop, headerHeight, clientHeight, toScrollTop, canvasHeight])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight,
      sliceTop,
      shouldScrollHorizontally,
      visibleRowsStart,
      visibleRowsEnd,
      renderedRowsStart,
      renderedRowsEnd,
      setClientHeight,
      setScrollTop,
      scrollRowIntoView,
      setScrollTo,
      setShouldScrollHorizontally,
    }
  }, [canvasHeight, renderedRowsEnd, renderedRowsStart, sliceTop, shouldScrollHorizontally, visibleRowsEnd, visibleRowsStart, setClientHeight, setScrollTop, scrollRowIntoView])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
