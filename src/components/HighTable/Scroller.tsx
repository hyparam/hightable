import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useMemo } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { ScrollModeContext } from '../../contexts/ScrollModeContext.js'
import styles from '../../HighTable.module.css'

interface Props {
  children?: React.ReactNode
  setViewportWidth: (width: number) => void // callback to set the current viewport width
}

export default function Scroller({
  children,
  setViewportWidth,
}: Props) {
  const { setShouldFocus, rowIndex } = useContext(CellNavigationContext)
  const { canvasHeight, sliceTop, onViewportChange, scrollRowIntoView, setScrollToTop } = useContext(ScrollModeContext)

  /**
   * Handle keyboard events for scrolling
   */
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== event.currentTarget) {
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
      scrollRowIntoView?.({ rowIndex })
      // focus the cell (once it exists)
      setShouldFocus(true)
    }
  }, [rowIndex, setShouldFocus, scrollRowIntoView])

  /**
   * Track viewport size and scroll position
   */
  const viewportRef = useCallback((viewport: HTMLDivElement) => {
    // Use arrow functions to get correct viewport type (not null)
    // eslint-disable-next-line func-style
    const updateViewportSize = () => {
      setViewportWidth(viewport.clientWidth)
      onViewportChange?.(viewport)
    }

    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
      onViewportChange?.(viewport)
    }

    // run once
    updateViewportSize()
    handleScroll()

    // set scrollToTop function
    if ('scrollTo' in viewport) {
      setScrollToTop?.(() => {
        // ^ we need to use a setter function, we cannot set a function as a value
        return (top: number) => {
          viewport.scrollTo({ top })
        }
      })
    } else {
      // scrollTo does not exist in jsdom, used in the tests
      setScrollToTop?.(undefined)
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
  }, [setScrollToTop, setViewportWidth, onViewportChange])

  // TODO(SL): maybe pass CSS variables instead of inline styles?
  // the viewport div scrollHeight will be equal to canvasHeight (unless custom CSS is messing with it)
  const canvasHeightStyle = useMemo(() => {
    return canvasHeight !== undefined ? { height: `${canvasHeight}px` } : {}
  }, [canvasHeight])

  const sliceTopStyle = useMemo(() => {
    return sliceTop !== undefined ? { top: `${sliceTop}px` } : {}
  }, [sliceTop])

  return (
    <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={onKeyDown} tabIndex={0}>
      <div style={canvasHeightStyle}>
        <div style={sliceTopStyle}>
          {children}
        </div>
      </div>
    </div>
  )
}
