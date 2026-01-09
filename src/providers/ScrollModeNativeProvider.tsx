import type { ReactNode } from 'react'
import { useCallback, useMemo, useState } from 'react'

import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, rowHeight } from '../helpers/constants.js'

interface ScrollModeNativeProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
  numRows: number
  padding: number
}

export function ScrollModeNativeProvider({ children, canvasHeight, numRows, padding }: ScrollModeNativeProviderProps) {
  const [scrollTo, setScrollTo] = useState<HTMLElement['scrollTo'] | undefined>(undefined)
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const [clientHeight, _setClientHeight] = useState<number | undefined>(undefined)
  const setClientHeight = useCallback((clientHeight: number) => {
    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // instead, it should return without updating the visible rows range, or set it to undefined.
    // TODO(SL): test in the browser (playwright)
    _setClientHeight(clientHeight === 0 ? 100 : clientHeight)
  }, [])

  // determine visible rows based on current scroll position (indexes refer to the virtual table domain)
  const visibleRowsStart = useMemo(() => {
    if (clientHeight === undefined || scrollTop === undefined) {
      return undefined
    }
    const start = Math.max(0, Math.floor(numRows * scrollTop / canvasHeight))
    if (isNaN(start)) throw new Error(`invalid first visible row ${start}`)
    return start
  }, [numRows, canvasHeight, scrollTop, clientHeight])
  const visibleRowsEnd = useMemo(() => {
    if (clientHeight === undefined || scrollTop === undefined) {
      return undefined
    }
    const end = Math.min(numRows, Math.ceil(numRows * (scrollTop + clientHeight) / canvasHeight))
    if (isNaN(end)) throw new Error(`invalid last visible row ${end}`)
    return end
  }, [numRows, canvasHeight, scrollTop, clientHeight])
  if (visibleRowsStart !== undefined && visibleRowsEnd !== undefined && visibleRowsEnd - visibleRowsStart > 1000) {
    throw new Error(`attempted to render too many rows ${visibleRowsEnd - visibleRowsStart}`)
  }

  const renderedRowsStart = useMemo(() => {
    if (visibleRowsStart === undefined) {
      return undefined
    }
    return Math.max(0, visibleRowsStart - padding)
  }, [visibleRowsStart, padding])
  const renderedRowsEnd = useMemo(() => {
    if (visibleRowsEnd === undefined) {
      return undefined
    }
    return Math.min(numRows, visibleRowsEnd + padding)
  }, [visibleRowsEnd, numRows, padding])

  if (canvasHeight <= 0) {
    throw new Error(`invalid canvasHeight ${canvasHeight}`)
  }

  // row: zero-based index in the virtual table domain
  const getRowTop = useCallback((row: number) => {
    return row * rowHeight
  }, [])

  /**
   * Vertically scroll to bring a specific row into view
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (scrollTo === undefined || visibleRowsStart === undefined || visibleRowsEnd === undefined || clientHeight === undefined) {
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
    // if the row is outside of the visible rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    // algorithm: go to the nearest edge (same as `block: nearest` in scrollIntoView)
    if (row < visibleRowsStart) {
      scrollTo({ top: getRowTop(row) })
    } else if (row >= visibleRowsEnd) {
      scrollTo({ top: getRowTop(row) - clientHeight + rowHeight })
    }
    // else, the row is in the table, and we use another mechanism to scroll to it (.scrollIntoView in useCellFocus.tsx)
    // beware, it's only for the native scroll mode
  }, [visibleRowsStart, visibleRowsEnd, scrollTo, getRowTop, clientHeight])

  const sliceTop = useMemo(() => {
    return getRowTop(renderedRowsStart ?? 0)
  }, [renderedRowsStart, getRowTop])

  const value = useMemo(() => {
    return {
      scrollMode: 'native' as const,
      canvasHeight,
      sliceTop,
      visibleRowsStart,
      visibleRowsEnd,
      renderedRowsStart,
      renderedRowsEnd,
      scrollRowIntoView,
      setClientHeight,
      setScrollTo,
      setScrollTop,
    }
  }, [canvasHeight, sliceTop, renderedRowsStart, visibleRowsStart, renderedRowsEnd, visibleRowsEnd, scrollRowIntoView, setClientHeight])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
