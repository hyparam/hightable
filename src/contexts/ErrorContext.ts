import { createContext } from 'react'

interface ErrorContextType {
  /** Callback called when an error occurs. Ignored if not set. */
  onError?: (error: unknown) => void
}

export const defaultErrorContext: ErrorContextType = {}

export const ErrorContext = createContext<ErrorContextType>(defaultErrorContext)
