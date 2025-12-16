import { RefObject, createContext } from 'react'

interface PortalContainerContextType {
  containerRef: RefObject<HTMLDivElement | null>
}

export const defaultPortalContainerContext: PortalContainerContextType = {
  containerRef: { current: null },
}

export const PortalContainerContext = createContext<PortalContainerContextType>(defaultPortalContainerContext)
