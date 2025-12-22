import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { ColumnParametersContext } from '../../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { ErrorContext } from '../../contexts/ErrorContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import styles from '../../HighTable.module.css'
import { ariaOffset, defaultOverscan, defaultPadding, rowHeight } from './constants.js'
import type { SliceProps } from './Slice.js'
import Slice from './Slice.js'

type Props = {
  setTableCornerWidth?: (width: number) => void // callback to set the current table corner width
  setViewportWidth: (width: number) => void // callback to set the current viewport width
} & SliceProps
export type ScrollerProps = SliceProps

export default function Scroller({
  overscan = defaultOverscan,
  padding = defaultPadding,
  setTableCornerWidth,
  setViewportWidth,
  ...rest }: Props) {
  // TODO(SL): replace with a callback function (https://react.dev/reference/react-dom/components/common#ref-callback)
  const viewportRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const [scrollToTop, setScrollToTop] = useState<((top: number) => void) | undefined>(undefined)
  const [rowsRange, setRowsRange] = useState<{ start: number, end: number } | undefined>(undefined)

  const { data, numRows } = useContext(DataContext)
  const { onScrollKeyDown } = useContext(CellNavigationContext)
  const { shouldScroll, setShouldScroll, cellPosition } = useContext(CellNavigationContext)
  const { onError } = useContext(ErrorContext)
  const { orderBy } = useContext(OrderByContext)

  // TODO(SL): extract above
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  /**
   * Compute the values:
   * - scrollHeight: total scrollable height
   * - rowsRange: rows to fetch based on the current scroll position
   * - tableOffset: offset of the table inside the scrollable area
   */
  // total scrollable height - it's fixed, based on the number of rows.
  // if CSS is not completely changed, viewport.current.scrollHeight will be equal to this value
  const scrollHeight = useMemo(() => (numRows + 1) * rowHeight, [numRows])

  const fetchRows = useCallback(({
    rowsRange: { start, end },
  }: {
    rowsRange: { start: number, end: number }
  }) => {
    if (data.fetch === undefined) {
      return
    }
    // abort the previous fetches if any
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    // fetch data when needed
    data.fetch({
      rowStart: start,
      rowEnd: end,
      columns: columnsParameters.map(({ name }) => name),
      orderBy,
      signal: abortController.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fetch was aborted, ignore the error
        return
      }
      onError?.(error)
    })
  }, [data, orderBy, onError, columnsParameters])

  const computeSetAndFetchRowsRange = useCallback((viewport: HTMLDivElement): { start: number, end: number } | undefined => {
    const { scrollHeight, scrollTop, clientHeight: viewportHeight } = viewport
    if (
      // nothing to render - should not happen because it should always contain the header row
      scrollHeight === 0
    ) {
      return undefined
    }
    // TODO(SL): remove this fallback? It's only for the tests, where the elements have zero height
    const clientHeight = viewportHeight === 0 ? 100 : viewportHeight

    // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
    const startView = Math.floor(numRows * scrollTop / scrollHeight)
    const endView = Math.ceil(numRows * (scrollTop + clientHeight) / scrollHeight)
    const start = Math.max(0, startView - overscan)
    const end = Math.min(numRows, endView + overscan)

    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)

    const rowsRange = { start, end }
    setRowsRange(rowsRange)
    fetchRows({ rowsRange })

    return rowsRange
  }, [numRows, overscan, fetchRows])

  // total scrollable height
  /* TODO: fix the computation on unstyled tables */
  const tableOffset = useMemo(() => {
    return Math.max(0, (rowsRange?.start ?? 0) - padding) * rowHeight
  }, [rowsRange, padding])

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
    if (!shouldScroll || scrollTop === undefined || scrollToTop === undefined || rowsRange === undefined) {
      return
    }
    setShouldScroll?.(false)
    const row = cellPosition.rowIndex - ariaOffset
    let nextScrollTop = scrollTop
    // if row outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    if (row < rowsRange.start || row >= rowsRange.end) {
      nextScrollTop = row * rowHeight
    }
    if (nextScrollTop !== scrollTop) {
      // scroll to the cell
      scrollToTop(nextScrollTop)
    }
  }, [cellPosition, shouldScroll, rowsRange, setShouldScroll, scrollToTop, scrollTop])

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
      computeSetAndFetchRowsRange(viewport)
    }
    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
      setScrollTop(viewport.scrollTop)
      computeSetAndFetchRowsRange(viewport)
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
  }, [setViewportWidth, computeSetAndFetchRowsRange])

  return (
    <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={onKeyDown} tabIndex={0}>
      <div style={{ height: `${scrollHeight}px` }}>
        <Slice
          rowsRange={rowsRange}
          tableOffset={tableOffset}
          padding={padding}
          setTableCornerWidth={setTableCornerWidth}
          {...rest}
        />
      </div>
    </div>
  )
}
