import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ViewportContext } from '../contexts/ViewportContext.js'

// TODO(SL): replace with https://usehooks-ts.com/react-hook/use-resize-observer#hook (dependency to usehooks-ts)?

interface ViewportProviderProps {
  children: ReactNode
}

export function ViewportProvider({ children }: ViewportProviderProps) {
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  // TODO(SL): update scrollTop only if it changes significantly (more than 1px?)
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const viewportRef = useRef<HTMLDivElement>(null)

  const setClampedScrollTop = useCallback((viewport: HTMLDivElement) => {
    // clamp to valid range
    const clampedTop = Math.max(0, Math.min(viewport.scrollTop, viewport.scrollHeight - viewport.clientHeight))
    if (clampedTop !== viewport.scrollTop) {
      console.debug('Clamping scrollTop from ', viewport.scrollTop, ' to ', clampedTop, 'before setting state.')
    }
    setScrollTop(clampedTop)
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      console.warn('Viewport element is not available. Viewport size will not be tracked accurately.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.ResizeObserver) {
      // for jsdom
      return
    }

    // Use an arrow function to get correct viewport type (not null)
    // eslint-disable-next-line func-style
    const updateViewportSize = () => {
      setViewportHeight(viewport.clientHeight)
      setViewportWidth(viewport.clientWidth)
    }

    // run once
    updateViewportSize()

    // listener
    const resizeObserver = new window.ResizeObserver(([entry]) => {
      if (!entry) {
        console.warn('ResizeObserver entry is not available.')
        return
      }
      updateViewportSize()
    })
    resizeObserver.observe(viewport)
    return () => {
      resizeObserver.unobserve(viewport)
      resizeObserver.disconnect()
    }
  }, [])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }

    // eslint-disable-next-line func-style
    const handleScroll = () => {
      // TODO(SL): throttle
      console.debug('Scrolled to scrollTop: ', viewport.scrollTop, ' scrollHeight: ', viewport.scrollHeight)
      setClampedScrollTop(viewport)
    }
    viewport.addEventListener('scroll', handleScroll)
    return () => {
      viewport.removeEventListener('scroll', handleScroll)
    }
  }, [setClampedScrollTop])

  const instantScrollTo = useCallback((newScrollTop: number) => {
    const viewport = viewportRef.current
    if (!viewport) {
      console.warn('Viewport element is not available. Cannot scroll.')
      return
    }
    // TODO(SL): handle behavior 'smooth' too? It might require async handling to wait for the scroll to finish
    console.log('Asking to scroll to: ', newScrollTop, ' current scrollTop: ', viewport.scrollTop, ' scrollHeight: ', viewport.scrollHeight)
    viewport.scrollTo({ top: newScrollTop, behavior: 'instant' })
  }, [])

  return (
    <ViewportContext.Provider value={{ viewportRef, viewportHeight, viewportWidth, scrollTop, instantScrollTo }}>
      {children}
    </ViewportContext.Provider>
  )
}
