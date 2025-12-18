import type { RefObject } from 'react'
import { createContext } from 'react'

interface PortalContainerContextType {
  containerRef: RefObject<HTMLDivElement | null>
}

export const defaultPortalContainerContext: PortalContainerContextType = {
  containerRef: { current: null },
}

export const PortalContainerContext = createContext<PortalContainerContextType>(defaultPortalContainerContext)
