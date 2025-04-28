import { ReactNode, createContext, useContext } from 'react'

type FocusContextType = 'TODO'

export const FocusContext = createContext<FocusContextType>('TODO')

interface FocusProviderProps {
  children: ReactNode
}

export function FocusProvider({ children }: FocusProviderProps) {
  return (
    <FocusContext.Provider value={'TODO'}>
      {children}
    </FocusContext.Provider>
  )
}

export default function useFocus() {
  return useContext(FocusContext)
}
