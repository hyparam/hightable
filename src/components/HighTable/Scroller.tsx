import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { RowsAndColumnsContext } from '../../contexts/RowsAndColumnsContext.js'
import type { ScrollModeContextType } from '../../contexts/ScrollModeContext.js'
import { ScrollModeContext } from '../../contexts/ScrollModeContext.js'
import styles from '../../HighTable.module.css'
import { ariaOffset, defaultOverscan, maxElementHeight, rowHeight } from './constants.js'

export interface ScrollerProps {
  overscan?: number // number of rows to fetch outside of the viewport
}

type Props = {
  headerHeight?: number // height of the table header
  setViewportWidth: (width: number) => void // callback to set the current viewport width
  children?: React.ReactNode
} & ScrollerProps

export default function Scroller({
  headerHeight = rowHeight,
  overscan = defaultOverscan,
  setViewportWidth,
  children,
}: Props) {
  // TODO(SL): replace with a callback function (https://react.dev/reference/react-dom/components/common#ref-callback)
  const viewportRef = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState<number>(0) // TODO(SL): undefined if we don't know yet?
  const [scrollToTop, setScrollToTop] = useState<((top: number) => void) | undefined>(undefined)
  const [top, setTop] = useState<number>(0) // offset of the contents (table) inside the scrollable area

  /* these states are only used in virtual scroll mode */
  // if we should scroll horizontally to the focused cell once scrolled vertically
  const [shouldScrollHorizontally, setShouldScrollHorizontally] = useState<boolean>(false)
  // scrollTop in the virtual canvas coordinates
  const [virtualScrollTop, setVirtualScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState<number>(0) // TODO(SL): undefined if we don't know yet?

  const { numRows } = useContext(DataContext)
  const { onScrollKeyDown } = useContext(CellNavigationContext)
  const { shouldScroll, setShouldScroll, cellPosition } = useContext(CellNavigationContext)
  const { rowsRangeWithPadding, setRowsRange } = useContext(RowsAndColumnsContext)

  // total table height - it's fixed, based on the number of rows.
  // if the number of rows is big, this value can overflow the maximum height supported by the browser.
  // If so, we switch to the 'virtual scroll' mode, where we override the scrolling mechanism.
  const tableHeight = useMemo(() => headerHeight + numRows * rowHeight, [numRows, headerHeight])

  const scrollMode = useMemo(() => {
    return tableHeight < maxElementHeight ? 'native' : 'virtual'
  }, [tableHeight])

  // total scrollable height
  // if CSS is not completely changed, viewportRef.current.scrollHeight will be equal to this value
  const canvasHeight = useMemo(() => {
    if (scrollMode === 'native') {
      return tableHeight
    }
    // virtual scroll mode
    // set a safe maximum height for the scrollable area
    return maxElementHeight
  }, [scrollMode, tableHeight])

  // sanity check
  if (canvasHeight <= 0) {
    throw new Error(`invalid canvasHeight ${canvasHeight}`)
  }

  /* All this region is only for virtual scroll mode */
  const toVirtualScrollTop = useCallback((scrollTop: number) => {
    // convert scrollTop (in canvas coordinates, between 0px and canvasHeight - viewportHeight)
    // to virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - viewportHeight)
    return scrollTop * (tableHeight - viewportHeight) / (canvasHeight - viewportHeight)
  }, [tableHeight, canvasHeight, viewportHeight])

  const toScrollTop = useCallback((virtualScrollTop: number) => {
    // convert virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - viewportHeight)
    // to scrollTop (in canvas coordinates, between 0px and canvasHeight - viewportHeight)
    return virtualScrollTop * (canvasHeight - viewportHeight) / (tableHeight - viewportHeight)
  }, [tableHeight, canvasHeight, viewportHeight])

  /**
   * Programmatically scroll to a specific row if needed.
   * Beware:
   * - row 1: header
   * - row 2: first data row
   * - row numRows + 1: last data row
   * @param row The row to scroll to (same semantic as aria-rowindex: 1-based, includes header)
   */
  const scrollVerticallyToRowIndex = useCallback((rowIndex: number) => {
    if (rowIndex < 1 || rowIndex > numRows + 2 || !Number.isInteger(rowIndex)) {
      throw new Error(`Invalid first visible row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 2}.`)
    }
    if (!scrollToTop) {
      console.warn('scrollToTop function is not available. Cannot scroll to row.')
      return
    }
    if (scrollMode === 'virtual') {
      if (rowIndex === 1) {
        // header row
        scrollToTop(0)
        return { canScrollHorizontally: true }
      }

      const row = rowIndex - 2 // convert to 0-based data row index

      // Three cases:
      // - the row is fully visible: do nothing
      // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
      // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
      const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
      const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - viewportHeight

      if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
        return { canScrollHorizontally: true }
      }

      // partly or totally hidden: update the scroll position
      const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
      const newVirtualScrollTop = virtualScrollTop + delta

      // Update the virtual scroll top
      setVirtualScrollTop(newVirtualScrollTop)

      const tolerancePixels = 1
      if (Math.abs(toScrollTop(delta)) > tolerancePixels) {
        const newScrollTop = toScrollTop(newVirtualScrollTop)

        // Ensure the new scrollTop is within bounds
        if (newScrollTop < 0 || newScrollTop > canvasHeight - viewportHeight) {
          console.warn(`Computed scrollTop ${newScrollTop} is out of bounds (0, ${canvasHeight - viewportHeight}). Cannot scroll to table row index: ${rowIndex}.`)
          return
        }

        // Update the coarse scroll position if the change is significant enough
        // for now, we ask for an instant scroll, there is no smooth scrolling
        // TODO(SL): if smooth scrolling is implemented, it might be async, so we should await it
        scrollToTop(newScrollTop)
      }

      return { canScrollHorizontally: true }
    } else {
      const row = rowIndex - ariaOffset
      // if row outside of the rows range, scroll to the estimated position of the cell,
      // to wait for the cell to be fetched and rendered
      if (rowsRangeWithPadding !== undefined && (row < rowsRangeWithPadding.start || row >= rowsRangeWithPadding.end)) {
        const newScrollTop = row * rowHeight
        if (newScrollTop !== scrollTop) {
          scrollToTop(row * rowHeight)
        }
      }
      return { canScrollHorizontally: true }
    }
  }, [numRows, virtualScrollTop, headerHeight, viewportHeight, toScrollTop, scrollToTop, canvasHeight, rowsRangeWithPadding, scrollMode, scrollTop])

  /**
   * React to cell navigation changes to scroll to the focused cell
   *
   * scroll if the navigation cell changed, or if entering navigation mode
   * this excludes the case where the whole table is focused (not in cell navigation mode), the user
   * is scrolling with the mouse or the arrow keys, and the cell exits the viewport: don't want to scroll
   * back to it
   */
  useEffect(() => {
    if (!shouldScroll) {
      return
    }
    setShouldScroll?.(false)

    // eslint-disable-next-line react-hooks/set-state-in-effect
    const result = scrollVerticallyToRowIndex(cellPosition.rowIndex)
    if (result?.canScrollHorizontally) {
      // TODO(SL): revisit this logic later
      setShouldScrollHorizontally(true)
    }
  }, [cellPosition, shouldScroll, setShouldScroll, setShouldScrollHorizontally, scrollVerticallyToRowIndex])

  /**
   * Track viewport size and scroll position
   */
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      throw new Error('Viewport element is not available. Viewport size will not be tracked accurately.')
    }

    // Use arrow functions to get correct viewport type (not null)
    // eslint-disable-next-line func-style
    const updateViewportSize = () => {
      setViewportWidth(viewport.clientWidth)
      // recompute the rows range if the height has changed
      setViewportHeight(viewport.clientHeight)
    }
    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
      setScrollTop(viewport.scrollTop)
    }

    // run once
    updateViewportSize()
    handleScroll()

    // set scrollToTop function
    if ('scrollTo' in viewport) {
      setScrollToTop(() => {
        // ^ we need to use a setter function, we cannot set a function as a value
        return (top: number) => {
          viewport.scrollTo({ top })
        }
      })
    } else {
      // scrollTo does not exist in jsdom, used in the tests
      setScrollToTop(undefined)
    }

    // listeners
    const resizeObserver = 'ResizeObserver' in window
      ? new window.ResizeObserver(([entry]) => {
          if (!entry) {
            console.warn('ResizeObserver entry is not available.')
            return
          }
          updateViewportSize()
        })
      // for jsdom
      : undefined
    resizeObserver?.observe(viewport)
    viewport.addEventListener('scroll', handleScroll)

    return () => {
      resizeObserver?.unobserve(viewport)
      resizeObserver?.disconnect()
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [setViewportWidth])

  /**
   * Handle keyboard events for scrolling
   */
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== viewportRef.current) {
      // don't handle the event if the target is not the scroller
      return
    }
    onScrollKeyDown?.(event)
  }, [onScrollKeyDown, viewportRef])

  const scrollModeContext: ScrollModeContextType = useMemo(() => ({
    scrollMode,
    shouldScrollHorizontally,
    setShouldScrollHorizontally,
  }), [scrollMode, shouldScrollHorizontally, setShouldScrollHorizontally])

  if (scrollMode === 'virtual') {
    // scrollTop has a limited precision (1px, or subpixel on some browsers) and is not predictable exactly, in particular when used with zooming.
    // The browser might also scroll slightly when focusing an element.
    // preciseScrollTop is decimal, computed for the virtual canvas, and updated by user action only when scrollTop changes significantly.
    const coarsePrecision = 40 // px. TODO(SL): how to choose the value? in percentage of viewportHeight/canvasHeight? Generally, it's 33px or -33px (the height of the focused cell?)
    const finePrecision = 1
    const expectedScrollTop = toScrollTop(virtualScrollTop)
    const difference = scrollTop - expectedScrollTop
    if (Math.abs(difference) > coarsePrecision) {
      // scrollTop changed significantly, it controls the position (coarse scroll)
      const newVirtualScrollTop = toVirtualScrollTop(scrollTop)
      setVirtualScrollTop(newVirtualScrollTop)
    } else if (Math.abs(difference) > finePrecision) {
      // scrollTop changed slightly, virtualScrollTop controls the position (fine scroll)
      // don't change virtualScrollTop, since it is more precise
      // and set scrollTop back to the precise value
      scrollToTop?.(expectedScrollTop)
      // TODO(SL): one issue is that when scrolling with a key arrow and the whole table is focused
      //  (not a cell), the scroll behavior is weird, it sometimes catches, and sometimes it is reverted.
      // Maybe adding some throttle on scroll events would help
    }
    // else, change is negligible, do nothing

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

    // Compute the derived values
    // TODO(SL): memoize?

    // special cases
    const isInHeader = numRows === 0 || virtualScrollTop < headerHeight

    // a. first visible row (r, d). It can be the header row (0).
    const firstVisibleRow = isInHeader
      ? 0
      : Math.max(0,
          Math.min(numRows - 1,
            Math.floor((virtualScrollTop - headerHeight) / rowHeight)
          )
        )
    // hidden pixels in the first visible row, or header
    const hiddenPixelsBefore = isInHeader
      ? virtualScrollTop
      : virtualScrollTop - headerHeight - firstVisibleRow * rowHeight

    // b. last visible row (s, e)
    const lastVisibleRow = Math.max(firstVisibleRow,
      Math.min(numRows - 1,
        Math.floor((virtualScrollTop + viewportHeight - headerHeight) / rowHeight)
      )
    )
    // const hiddenPixelsAfter = headerHeight + (lastVisibleRow + 1) * rowHeight - (virtualScrollTop + viewportHeight)

    // c. previous rows (k)
    const previousRows = 0 // Math.max(0, Math.min(padding, firstVisibleRow))

    // d. following rows (l)
    const followingRows = 0 // Math.max(0, Math.min(padding, numRows - 1 - lastVisibleRow))

    // e. offset of the first row in the canvas (u)
    setTop(isInHeader
      ? scrollTop - hiddenPixelsBefore
      : scrollTop - headerHeight - previousRows * rowHeight - hiddenPixelsBefore
    )

    // f. first data row and number of data rows
    const firstDataRow = firstVisibleRow - previousRows
    const numDataRows = numRows === 0
      ? 0
      : previousRows + followingRows + lastVisibleRow - firstVisibleRow + 1
    setRowsRange?.({ start: firstDataRow, end: firstDataRow + numDataRows })
  } else {
    // TODO(SL): remove this fallback? It's only for the tests, where the elements have zero height
    const clientHeight = viewportHeight === 0 ? 100 : viewportHeight

    // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
    const startView = Math.floor(numRows * scrollTop / canvasHeight)
    const endView = Math.ceil(numRows * (scrollTop + clientHeight) / canvasHeight)
    const start = Math.max(0, startView - overscan)
    const end = Math.min(numRows, endView + overscan)

    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)

    const rowsRange = { start, end }
    setRowsRange?.(rowsRange)

    // offset of the contents (table) inside the scrollable area
    // Note: it does not depend on headerHeight, because the header is always present in the DOM
    setTop((rowsRangeWithPadding?.startPadding ?? 0) * rowHeight)
  }

  return (
    <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={onKeyDown} tabIndex={0}>
      <div style={{ height: `${canvasHeight}px` }}>
        <div style={{ top: `${top}px` }}>
          <ScrollModeContext.Provider value={scrollModeContext}>
            {children}
          </ScrollModeContext.Provider>
        </div>
      </div>
    </div>
  )
}
