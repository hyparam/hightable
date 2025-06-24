import { ReactNode, RefObject, createContext, useContext, useRef } from 'react'

interface PortalContainerContextType {
  containerRef: RefObject<HTMLDivElement | null>
}

const PortalContainerContext = createContext<PortalContainerContextType>({
  containerRef: { current: null },
})

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

export function usePortalContainer() {
  return useContext(PortalContainerContext)
}
