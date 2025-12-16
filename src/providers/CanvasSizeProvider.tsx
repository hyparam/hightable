import type { ReactNode } from 'react'

import { CanvasSizeContext, DEFAULT_MAX_HEIGHT, DEFAULT_MIN_HEIGHT } from '../contexts/CanvasSizeContext'

interface CanvasSizeProviderProps {
  /* children components */
  children: ReactNode
  /* number of rows in the canvas */
  numRows: number
  /* height of each row in pixels. We assume all the rows have the same height. */
  rowHeight: number
  /* header height in pixels. Defaults to rowHeight. */
  headerHeight?: number
  /* optional minimum height of the canvas in pixels. The default is 0 */
  minHeight?: number
  /* optional maximum height of the canvas in pixels. The default is 1M pixels - see https://meyerweb.com/eric/thoughts/2025/08/07/infinite-pixels/ */
  maxHeight?: number
}

export function CanvasSizeProvider({ children, numRows, rowHeight, headerHeight, minHeight, maxHeight }: CanvasSizeProviderProps) {
  const height = numRows * rowHeight + (headerHeight ?? rowHeight)
  const canvasHeight = Math.min(Math.max(height, minHeight ?? DEFAULT_MIN_HEIGHT), maxHeight ?? DEFAULT_MAX_HEIGHT)

  return (
    <CanvasSizeContext.Provider value={{ canvasHeight }}>
      {children}
    </CanvasSizeContext.Provider>
  )
}
