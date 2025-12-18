import type { RefObject } from 'react'
import { createContext } from 'react'

interface ViewportContextType {
  viewportRef: RefObject<HTMLDivElement | null>
  viewportHeight?: number // height of the viewport in pixels
  viewportWidth?: number // width of the viewport in pixels
}

export const defaultViewportContext: ViewportContextType = {
  viewportRef: { current: null },
}

export const ViewportContext = createContext<ViewportContextType>(defaultViewportContext)
