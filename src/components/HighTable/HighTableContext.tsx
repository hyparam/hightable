import { ReactNode, createContext, useContext } from 'react'

interface HighTableContextType {
  portalTarget: HTMLElement | null
}

const HighTableContext = createContext<HighTableContextType | null>(null)

export function useHighTable() {
  const context = useContext(HighTableContext)
  if (context === null) {
    throw new Error('useHighTable must be used within a HighTable')
  }
  return context
}

interface HighTableProviderProps {
  children: ReactNode;
  portalTarget: HTMLElement | null;
}

export function HighTableProvider({
  children,
  portalTarget,
}: HighTableProviderProps) {
  return (
    <HighTableContext.Provider value={{ portalTarget }}>
      {children}
    </HighTableContext.Provider>
  )
}

export { HighTableContext }
