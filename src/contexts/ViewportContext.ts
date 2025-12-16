import type { RefObject } from 'react'
import { createContext } from 'react'

interface ViewportContextType {
  viewportRef: RefObject<HTMLDivElement | null>
  viewportHeight?: number // height of the viewport in pixels
  viewportWidth?: number // width of the viewport in pixels
  scrollTop?: number // current scroll position of the viewport
  instantScrollTo?: (top: number) => void // function to scroll the viewport to a specific position, with 'instant' behavior
}

export const defaultViewportContext: ViewportContextType = {
  viewportRef: { current: null },
}

export const ViewportContext = createContext<ViewportContextType>(defaultViewportContext)
