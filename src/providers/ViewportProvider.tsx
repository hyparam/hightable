import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { ViewportContext } from '../contexts/ViewportContext.js'

// TODO(SL): replace with https://usehooks-ts.com/react-hook/use-resize-observer#hook (dependency to usehooks-ts)?

interface ViewportProviderProps {
  children: ReactNode
}

export function ViewportProvider({ children }: ViewportProviderProps) {
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
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

  return (
    <ViewportContext.Provider value={{ viewportRef, viewportHeight, viewportWidth }}>
      {children}
    </ViewportContext.Provider>
  )
}
