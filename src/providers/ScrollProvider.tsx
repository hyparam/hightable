import { type ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'

import { CellNavigationContext } from '../contexts/CellNavigationContext.js'
import { useNumRows } from '../contexts/DataContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import { useHeaderHeight } from '../contexts/TableCornerSizeContext.js'
import { useViewportHeight } from '../contexts/ViewportSizeContext.js'
import { defaultPadding, maxElementHeight, rowHeight } from '../helpers/constants.js'
import { computeDerivedValues, createScale, getScrollActionForRow, initializeScrollState, scrollReducer } from '../helpers/scroll.js'
import type { HighTableProps } from '../types.js'

type ScrollProviderProps = Pick<HighTableProps, 'padding'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Provide the scroll state and logic to the table, through the ScrollContext.
 */
export function ScrollProvider({ children, padding = defaultPadding }: ScrollProviderProps) {
  const [{ scale, scrollTop, scrollTopAnchor, localOffset }, dispatch] = useReducer(scrollReducer, undefined, initializeScrollState)
  const { cellPosition, focusState, focusDispatch } = useContext(CellNavigationContext)
  const clientHeight = useViewportHeight()
  /** Height of the header row, in pixels */
  const headerHeight = useHeaderHeight()
  /** The actual number of rows in the data frame */
  const numRows = useNumRows()

  const [scrollTo, setScrollTo] = useState<HTMLElement['scrollTo'] | undefined>(undefined)
  const setScrollTop = useCallback((scrollTop: number) => {
    dispatch({ type: 'ON_SCROLL', scrollTop })
    focusDispatch?.({ type: 'SCROLLED_EVENT_RECEIVED' })
  }, [focusDispatch])

  const currentScale = useMemo(() => {
    if (clientHeight === undefined) {
      return undefined
    }
    return createScale({ clientHeight, headerHeight, rowHeight, numRows, maxElementHeight })
  }, [clientHeight, headerHeight, numRows])

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
   */
  useEffect(() => {
    const { rowIndex } = cellPosition
    if (!focusDispatch || focusState.status !== 'should_scroll_into_view') {
      return
    }
    if (!scale || scrollTopAnchor === undefined) {
      focusDispatch({ type: 'CANNOT_SCROLL_YET' })
      return
    }
    const action = getScrollActionForRow({ rowIndex, scale, scrollTopAnchor, localOffset })
    if (!action) {
      focusDispatch({ type: 'NO_NEED_TO_SCROLL' })
      return
    }
    // side effect: scroll to the new position while updating the state optimistically
    if (action.type === 'SCROLL_TO') {
      if (!scrollTo) {
        // Safe-guard for the tests with jsdom, which don't provide scrollTo
        focusDispatch({ type: 'CANNOT_SCROLL_YET' })
        return
      }
      scrollTo({ top: action.scrollTop, behavior: 'instant' })
      focusDispatch({ type: 'GLOBAL_SCROLLING_STARTED' })
      dispatch(action)
    } else {
      focusDispatch({ type: 'LOCAL_SCROLLING_STARTED' })
      dispatch(action)
    }
  }, [cellPosition, scrollTo, scrollTopAnchor, localOffset, scale, focusDispatch, focusState])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight: scale ? scale.canvasHeight : undefined,
      setScrollTop,
      setScrollTo,
      ...computeDerivedValues({
        scale,
        scrollTop,
        scrollTopAnchor,
        localOffset,
        padding,
      }),
    }
  }, [scale, scrollTop, scrollTopAnchor, localOffset, padding, setScrollTop])
  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  )
}
