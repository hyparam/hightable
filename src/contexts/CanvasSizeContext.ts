import { createContext } from 'react'

/**
 * Hook to provide the size of the canvas (the area containing the table slice).
 * The canvas height is computed based on the number of rows, the row height and the header height.
 * It can also be constrained by optional minimum and maximum heights.
 * The canvasRef can be used to attach to the canvas element to measure its size if needed.
 */
interface CanvasSizeContextType {
  /* height of the canvas in pixels */
  canvasHeight: number
}

// TODO(SL): make min and max height different constants. For now, they are the same, to reduce the moving parts in the app.
export const DEFAULT_MIN_HEIGHT = 10_000
export const DEFAULT_MAX_HEIGHT = 10_000

export const defaultCanvasSizeContext: CanvasSizeContextType = {
  canvasHeight: DEFAULT_MAX_HEIGHT,
}

export const CanvasSizeContext = createContext<CanvasSizeContextType>(defaultCanvasSizeContext)
