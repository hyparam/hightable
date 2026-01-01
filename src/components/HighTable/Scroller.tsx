import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { RowsAndColumnsContext } from '../../contexts/RowsAndColumnsContext.js'
import styles from '../../HighTable.module.css'
import { ariaOffset, rowHeight } from './constants.js'

interface Props {
  headerHeight?: number // height of the table header
  setViewportWidth: (width: number) => void // callback to set the current viewport width
  children?: React.ReactNode
}

export default function Scroller({
  headerHeight = rowHeight,
  setViewportWidth,
  children,
}: Props) {
  // TODO(SL): replace with a callback function (https://react.dev/reference/react-dom/components/common#ref-callback)
  const viewportRef = useRef<HTMLDivElement>(null)

  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const [scrollToTop, setScrollToTop] = useState<((top: number) => void) | undefined>(undefined)

  const { numRows } = useContext(DataContext)
  const { onScrollKeyDown } = useContext(CellNavigationContext)
  const { shouldScroll, setShouldScroll, cellPosition } = useContext(CellNavigationContext)
  const { fetchedRowsRange, renderedRowsRange, setVisibleRowsRange } = useContext(RowsAndColumnsContext)

  /**
   * Compute the values:
   * - scrollHeight: total scrollable height
   * - rowsRange: rows to fetch based on the current scroll position
   * - tableOffset: offset of the table inside the scrollable area
   */
  // total scrollable height - it's fixed, based on the number of rows.
  // if CSS is not completely changed, viewport.current.scrollHeight will be equal to this value
  const scrollHeight = useMemo(() => headerHeight + numRows * rowHeight, [numRows, headerHeight])

  // sanity check
  if (scrollHeight <= 0) {
    throw new Error(`invalid scrollHeight ${scrollHeight}`)
  }

  const computeAndSetRowsRange = useCallback((viewport: HTMLDivElement) => {
    const { scrollTop, clientHeight: viewportHeight } = viewport

    // TODO(SL): remove this fallback? It's only for the tests, where the elements have zero height
    const clientHeight = viewportHeight === 0 ? 100 : viewportHeight

    // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
    const start = Math.max(0, Math.floor(numRows * scrollTop / scrollHeight))
    const end = Math.min(numRows, Math.ceil(numRows * (scrollTop + clientHeight) / scrollHeight))

    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)
    setVisibleRowsRange?.({ start, end })
  }, [numRows, scrollHeight, setVisibleRowsRange])

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

  /**
   * React to cell navigation changes to scroll to the focused cell
   *
   * scroll if the navigation cell changed, or if entering navigation mode
   * this excludes the case where the whole table is focused (not in cell navigation mode), the user
   * is scrolling with the mouse or the arrow keys, and the cell exits the viewport: don't want to scroll
   * back to it
   */
  useEffect(() => {
    if (!shouldScroll || scrollTop === undefined || scrollToTop === undefined || fetchedRowsRange === undefined) {
      return
    }
    setShouldScroll?.(false)
    const row = cellPosition.rowIndex - ariaOffset
    let nextScrollTop = scrollTop
    // if the row is outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    // TODO(SL): should fetchedRowsRange be replaced with visibleRowsRange?
    if (row < fetchedRowsRange.start || row >= fetchedRowsRange.end) {
      nextScrollTop = row * rowHeight
    }
    if (nextScrollTop !== scrollTop) {
      // scroll to the cell
      scrollToTop(nextScrollTop)
    }
  }, [cellPosition, shouldScroll, fetchedRowsRange, setShouldScroll, scrollToTop, scrollTop])

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
      computeAndSetRowsRange(viewport)
    }
    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
      setScrollTop(viewport.scrollTop)
      computeAndSetRowsRange(viewport)
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
  }, [setViewportWidth, computeAndSetRowsRange])

  // Note: it does not depend on headerHeight, because the header is always present in the DOM
  const top = useMemo(() => {
    return (renderedRowsRange?.start ?? 0) * rowHeight
  }, [renderedRowsRange])

  return (
    <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={onKeyDown} tabIndex={0}>
      <div style={{ height: `${scrollHeight}px` }}>
        <div style={{ top: `${top}px` }}>
          {children}
        </div>
      </div>
    </div>
  )
}
