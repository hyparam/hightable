import { ReactNode, RefObject, createContext, useContext } from 'react'

interface PortalContainerContextType {
  containerRef: RefObject<HTMLDivElement |null>
}

const PortalContainerContext = createContext<PortalContainerContextType>({
  containerRef: { current: null },
})

interface PortalContainerProviderProps {
  containerRef: RefObject<HTMLDivElement | null>
  children: ReactNode
}

export function PortalContainerProvider({
  containerRef,
  children,
}: PortalContainerProviderProps) {
  return (
    <PortalContainerContext.Provider value={{ containerRef }}>
      {children}
    </PortalContainerContext.Provider>
  )
}

export function usePortalContainer() {
  return useContext(PortalContainerContext)
}
