import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'
import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { ariaOffset, rowHeight } from '../helpers/constants.js'

interface ScrollModeNativeProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
  numRows: number
}

export function ScrollModeNativeProvider({ children, canvasHeight, numRows }: ScrollModeNativeProviderProps) {
  const [scrollTo, setScrollTo] = useState<(HTMLElement['scrollTo'] | undefined)>(undefined)
  const { visibleRowsRange, renderedRowsRange, setVisibleRowsRange } = useContext(RowsAndColumnsContext)
  const [clientHeight, setClientHeight] = useState(100)

  if (canvasHeight <= 0) {
    throw new Error(`invalid canvasHeight ${canvasHeight}`)
  }

  const onViewportChange = useCallback(({ clientHeight, scrollTop }: { clientHeight: number, scrollTop: number }) => {
    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // instead, it should return without updating the visible rows range, or set it to undefined.
    // TODO(SL): test in the browser (playwright)
    const effectiveClientHeight = clientHeight === 0 ? 100 : clientHeight
    setClientHeight(effectiveClientHeight)

    // determine visible rows based on current scroll position (indexes refer to the virtual table domain)
    const start = Math.max(0, Math.floor(numRows * scrollTop / canvasHeight))
    const end = Math.min(numRows, Math.ceil(numRows * (scrollTop + effectiveClientHeight) / canvasHeight))
    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start}`)
    setVisibleRowsRange?.({ start, end })
  }, [numRows, canvasHeight, setVisibleRowsRange])

  // row: zero-based index in the virtual table domain
  const getRowTop = useCallback((row: number) => {
    return row * rowHeight
  }, [])

  /**
   * Vertically scroll to bring a specific row into view
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (scrollTo === undefined || visibleRowsRange === undefined) {
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
    if (row < visibleRowsRange.start) {
      scrollTo({ top: getRowTop(row) })
    } else if (row >= visibleRowsRange.end) {
      scrollTo({ top: getRowTop(row) - clientHeight + rowHeight })
    }
    // else, the row is in the table, and we use another mechanism to scroll to it (.scrollIntoView in useCellFocus.tsx)
    // beware, it's only for the native scroll mode
  }, [visibleRowsRange, scrollTo, getRowTop, clientHeight])

  const sliceTop = useMemo(() => {
    return getRowTop(renderedRowsRange?.start ?? 0)
  }, [renderedRowsRange, getRowTop])

  const value = useMemo(() => {
    return {
      scrollMode: 'native' as const,
      canvasHeight,
      sliceTop,
      onViewportChange,
      scrollRowIntoView,
      setScrollTo,
    }
  }, [canvasHeight, sliceTop, onViewportChange, scrollRowIntoView])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
