import { createContext, useContext } from 'react'

type SetViewportSizeContextType = (element: HTMLElement) => void

export const ViewportHeightContext = createContext<number | undefined>(undefined)
export const ViewportWidthContext = createContext<number | undefined>(undefined)
export const SetViewportSizeContext = createContext<SetViewportSizeContextType | undefined>(undefined)

export function useViewportWidth() {
  return useContext(ViewportWidthContext)
}

export function useViewportHeight() {
  return useContext(ViewportHeightContext)
}

export function useSetViewportSize() {
  return useContext(SetViewportSizeContext)
}
