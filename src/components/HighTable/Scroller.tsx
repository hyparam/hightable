import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useMemo } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { ScrollContext } from '../../contexts/ScrollContext.js'
import styles from '../../HighTable.module.css'

interface Props {
  /** Callback to set the current viewport width */
  setViewportWidth: (width: number) => void
  /** Child components */
  children?: React.ReactNode
}

export default function Scroller({ children, setViewportWidth }: Props) {
  const { goToCurrentCell } = useContext(CellNavigationContext)
  const { canvasHeight, sliceTop, setClientHeight, setScrollTop, setScrollTo } = useContext(ScrollContext)

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
      goToCurrentCell?.()
    }
  }, [goToCurrentCell])

  /**
   * Track viewport size and scroll position
   */
  const viewportRef = useCallback((viewport: HTMLDivElement | null) => {
    if (!viewport) {
      return
    }

    // Use arrow functions to get correct viewport type (not null)
    // eslint-disable-next-line func-style
    const updateViewportSize = () => {
      setViewportWidth(viewport.clientWidth)
      setClientHeight?.(viewport.clientHeight)
    }

    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle? see https://github.com/hyparam/hightable/pull/347
      setScrollTop?.(viewport.scrollTop)
    }

    // run once
    updateViewportSize()
    handleScroll()

    // register scrollTo
    if ('scrollTo' in viewport) {
      setScrollTo?.(() => {
        // ^ we need to use a setter function, we cannot set a function as a value
        return viewport.scrollTo.bind(viewport)
      })
    } else {
      // scrollTo does not exist in jsdom, used in the tests
      setScrollTo?.(undefined)
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
  }, [setScrollTo, setViewportWidth, setClientHeight, setScrollTop])

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
