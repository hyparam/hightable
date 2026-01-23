import { type ReactNode, useCallback, useMemo, useReducer, useState } from 'react'

import { ScrollContext } from '../contexts/ScrollContext.js'
import { defaultPadding, maxElementHeight, rowHeight } from '../helpers/constants.js'
import { computeDerivedValues, createScale, getScrollActionForRow, initializeScrollState, scrollReducer } from '../helpers/scroll.js'

export interface ScrollProviderProps {
  padding?: number // number of rows to render beyond the visible table cells
}

type Props = {
  children: ReactNode
  headerHeight: number
  numRows: number
} & ScrollProviderProps

export function ScrollProvider({ children, headerHeight, numRows, padding = defaultPadding }: Props) {
  const [{ scale, scrollTop, globalAnchor, isScrolling, localOffset }, dispatch] = useReducer(scrollReducer, undefined, initializeScrollState)
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
   * @param rowIndex The row to scroll to (same semantic as aria-rowindex: 1-based, includes header)
   */
  const scrollRowIntoView = useCallback(({ rowIndex }: { rowIndex: number }) => {
    if (!scale || globalAnchor === undefined) {
      return
    }
    const action = getScrollActionForRow({ rowIndex, scale, globalAnchor, localOffset })
    if (!action) {
      return
    }
    // side effect: scroll to the new position while updating the state optimistically
    if (action.type === 'SCROLL_TO') {
      if (!scrollTo) {
        // Safe-guard for the tests with jsdom, which don't provide scrollTo
        return
      }
      scrollTo({ top: action.scrollTop, behavior: 'instant' })
    }
    // update the state
    dispatch(action)
  }, [scrollTo, globalAnchor, localOffset, scale])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight: scale ? scale.canvasHeight : undefined,
      isScrolling,
      setClientHeight,
      setScrollTop,
      scrollRowIntoView,
      setScrollTo,
      ...computeDerivedValues({
        scale,
        scrollTop,
        globalAnchor,
        localOffset,
        padding,
      }),
    }
  }, [scale, scrollTop, globalAnchor, localOffset, padding, isScrolling, setClientHeight, setScrollTop, scrollRowIntoView])
  return (
    <ScrollContext.Provider value={value}>
      {children}
    </ScrollContext.Provider>
  )
}
