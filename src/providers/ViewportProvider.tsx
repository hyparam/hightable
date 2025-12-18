import type { ReactNode } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { ViewportContext } from '../contexts/ViewportContext.js'

// TODO(SL): replace with https://usehooks-ts.com/react-hook/use-resize-observer#hook (dependency to usehooks-ts)?

interface ViewportProviderProps {
  children: ReactNode
}

// clamp to valid range
function clampScrollTop(viewport: HTMLDivElement) {
  const clampedTop = Math.max(0, Math.min(viewport.scrollTop, viewport.scrollHeight - viewport.clientHeight))
  if (clampedTop !== viewport.scrollTop) {
    console.debug('Clamping scrollTop from ', viewport.scrollTop, ' to ', clampedTop, 'before setting state.')
  }
  return clampedTop
}

const throttleTimeoutMs = 200
export function ViewportProvider({ children }: ViewportProviderProps) {
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  const [scrollTop, setScrollTop] = useState<number | undefined>(undefined)
  const lastScrollUpdate = useRef(0)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

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
      const value = clampScrollTop(viewport)

      // throttle updates
      // adapted from https://www.usehooks.io/docs/use-throttle (MIT license)
      const now = Date.now()
      const timeSinceLastUpdate = now - lastScrollUpdate.current
      if (timeSinceLastUpdate >= throttleTimeoutMs) {
        // If enough time has passed, update immediately
        setScrollTop(value)
        lastScrollUpdate.current = now
      }
      else {
        // Otherwise, cancel the pending update if any
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        // and schedule an update for the remaining time
        timeoutRef.current = setTimeout(() => {
          setScrollTop(value)
          lastScrollUpdate.current = Date.now()
        }, throttleTimeoutMs - timeSinceLastUpdate)
      }
    }
    viewport.addEventListener('scroll', handleScroll)
    return () => {
      viewport.removeEventListener('scroll', handleScroll)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const instantScrollTo = useCallback((newScrollTop: number) => {
    const viewport = viewportRef.current
    if (!viewport) {
      console.warn('Viewport element is not available. Cannot scroll.')
      return
    }
    // TODO(SL): handle behavior 'smooth' too? It might require async handling to wait for the scroll to finish
    viewport.scrollTo({ top: newScrollTop, behavior: 'instant' })
  }, [])

  return (
    <ViewportContext.Provider value={{ viewportRef, viewportHeight, viewportWidth, scrollTop, instantScrollTo }}>
      {children}
    </ViewportContext.Provider>
  )
}
