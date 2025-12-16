import { ReactNode, useRef } from 'react'

import { PortalContainerContext } from '../contexts/PortalContainerContext.js'

interface PortalContainerProviderProps {
  children: ReactNode
}

export function PortalContainerProvider({
  children,
}: PortalContainerProviderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  return (
    <PortalContainerContext.Provider value={{ containerRef }}>
      {children}
    </PortalContainerContext.Provider>
  )
}
