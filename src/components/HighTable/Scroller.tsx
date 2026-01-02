import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { RowsAndColumnsContext } from '../../contexts/RowsAndColumnsContext.js'
import { ScrollerContext } from '../../contexts/ScrollerContext.js'
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

  const [scrollToTop, setScrollToTop] = useState<((top: number) => void) | undefined>(undefined)

  const { numRows } = useContext(DataContext)
  const { setShouldFocus, rowIndex } = useContext(CellNavigationContext)
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

    // determine visible rows based on current scroll position (indexes refer to the virtual table domain)
    const start = Math.max(0, Math.floor(numRows * scrollTop / scrollHeight))
    const end = Math.min(numRows, Math.ceil(numRows * (scrollTop + clientHeight) / scrollHeight))

    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)
    setVisibleRowsRange?.({ start, end })
  }, [numRows, scrollHeight, setVisibleRowsRange])

  /**
   * Vertically scroll to bring a specific row into view
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (scrollToTop === undefined || fetchedRowsRange === undefined) {
      return
    }
    if (rowIndex < 1) {
      throw new Error(`invalid rowIndex ${rowIndex}`)
    }
    if (rowIndex === 1) {
      // always visible
      return
    }
    // should be zero-based
    const row = rowIndex - ariaOffset
    // if the row is outside of the fetched rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    // TODO(SL): should fetchedRowsRange be replaced with visibleRowsRange?
    if (row < fetchedRowsRange.start || row >= fetchedRowsRange.end) {
      scrollToTop(row * rowHeight)
    }
  }, [fetchedRowsRange, scrollToTop])

  /**
   * Handle keyboard events for scrolling
   */
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== viewportRef.current) {
      // don't handle the event if the target is not the scroller
      return
    }
    const { key } = event
    // the user can scroll with the keyboard using the arrow keys. Here we only handle the Tab,
    // Enter and Space keys, to enter the cell navigation mode instead of scrolling the table
    // TODO(SL): exclude other meta keys (return without handling if shiftKey, ctrlKey, altKey, metaKey)
    if ((key === 'Tab' && !event.shiftKey) || key === 'Enter' || key === ' ') {
      event.stopPropagation()
      event.preventDefault()
      // scroll to the active cell
      scrollRowIntoView({ rowIndex })
      // focus the cell (once it exists)
      setShouldFocus(true)
    }
  }, [rowIndex, setShouldFocus, scrollRowIntoView])

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
      // recompute the rows range if the scroll position changed
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
          <ScrollerContext.Provider value={{ scrollRowIntoView }}>
            {children}
          </ScrollerContext.Provider>
        </div>
      </div>
    </div>
  )
}
