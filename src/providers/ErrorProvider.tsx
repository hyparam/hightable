import { useMemo } from 'react'

import { ErrorContext } from '../contexts/ErrorContext.js'

export interface ErrorProviderProps {
  /** Callback called when an error occurs. Ignored if not set. */
  onError?: (error: unknown) => void
}

type Props = ErrorProviderProps & {
  children: React.ReactNode
}

export function ErrorProvider({ children, onError }: Props) {
  const value = useMemo(() => ({
    onError,
  }), [onError])

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
}
