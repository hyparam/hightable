import { createContext } from 'react'

type SetViewportSizeContextType = (element: HTMLElement) => void

export const ViewportHeightContext = createContext<number | undefined>(undefined)
export const ViewportWidthContext = createContext<number | undefined>(undefined)
export const SetViewportSizeContext = createContext<SetViewportSizeContextType | undefined>(undefined)
