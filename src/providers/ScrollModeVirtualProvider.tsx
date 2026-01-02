import { type ReactNode, useContext, useEffect, useMemo } from 'react'

import { ErrorContext } from '../contexts/ErrorContext.js'
import { ScrollModeContext } from '../contexts/ScrollModeContext.js'

interface ScrollModeVirtualProviderProps {
  children: ReactNode
  canvasHeight: number // total scrollable height. It must be strictly positive.
}

export function ScrollModeVirtualProvider({ children, canvasHeight }: ScrollModeVirtualProviderProps) {
  const { onError } = useContext(ErrorContext)

  useEffect(() => {
    onError?.(new Error('Virtual scroll mode is not implemented yet.'))
  }, [onError])

  const value = useMemo(() => {
    return {
      scrollMode: 'virtual' as const,
      canvasHeight,
      // TODO(SL): provide the rest of the context
    }
  }, [canvasHeight])

  return (
    <ScrollModeContext.Provider value={value}>
      {children}
    </ScrollModeContext.Provider>
  )
}
