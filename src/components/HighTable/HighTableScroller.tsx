import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import styles from '../../HighTable.module.css'
import { rowHeight } from './constants.js'
import type { HighTableSliceProps } from './HighTableSlice.js'
import HighTableSlice from './HighTableSlice.js'

type Props = {
  setViewportWidth: (width: number) => void // callback to set the current viewport width
} & HighTableSliceProps
export type HighTableScrollerProps = HighTableSliceProps

export default function HighTableScroller({ setViewportWidth, ...rest }: Props) {
  // TODO(SL): replace with a callback function (https://react.dev/reference/react-dom/components/common#ref-callback)
  const viewportRef = useRef<HTMLDivElement>(null)

  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const [scrollToTop, setScrollToTop] = useState<((top: number) => void) | undefined>(undefined)

  const { numRows } = useContext(DataContext)
  const { onScrollKeyDown } = useContext(CellNavigationContext)

  // total scrollable height - it's fixed, based on the number of rows.
  // if CSS is not completely changed, viewport.current.scrollHeight will be equal to this value
  const scrollHeight = useMemo(() => (numRows + 1) * rowHeight, [numRows])

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== viewportRef.current) {
      // don't handle the event if the target is not the scroller
      return
    }
    onScrollKeyDown?.(event)
  }, [onScrollKeyDown, viewportRef])

  // handle scrolling and component resizing
  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      throw new Error('Viewport element is not available. Viewport size will not be tracked accurately.')
    }

    // Use arrow functions to get correct viewport type (not null)

    // eslint-disable-next-line func-style
    const updateViewportSize = () => {
      setViewportHeight(viewport.clientHeight)
      setViewportWidth(viewport.clientWidth)
    }
    // eslint-disable-next-line func-style
    const handleScroll = () => {
      setScrollTop(viewport.scrollTop)
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
    }

    // run once
    updateViewportSize()
    handleScroll()
    // set scrollToTop function
    if ('scrollTo' in viewport) {
      setScrollToTop(() => {
        // ^ we need to use a setter function, we cannot set a funciton as a value
        return (top: number) => {
          viewport.scrollTo({ top })
        }
      })
    } else {
      // scrollTo does not exist in jsdom, used in the tests
      setScrollToTop(undefined)
    }

    // listener
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

  return (
    <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={onKeyDown} tabIndex={0}>
      <div style={{ height: `${scrollHeight}px` }}>
        <HighTableSlice
          scrollTop={scrollTop}
          scrollHeight={scrollHeight}
          viewportHeight={viewportHeight}
          scrollToTop={scrollToTop}
          {...rest}
        />
      </div>
    </div>
  )
}
