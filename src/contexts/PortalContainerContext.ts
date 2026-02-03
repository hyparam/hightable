import { createContext } from 'react'

/** Container element for portals */
type PortalContainerContextType = HTMLDivElement | null

export const defaultPortalContainerContext: PortalContainerContextType = null

export const PortalContainerContext = createContext<PortalContainerContextType>(defaultPortalContainerContext)
