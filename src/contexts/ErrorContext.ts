import { createContext } from 'react'

interface ErrorContextType {
  /** Optional callback to call when an error occurs. */
  onError?: (error: unknown) => void
}

export const defaultErrorContext: ErrorContextType = {}

export const ErrorContext = createContext<ErrorContextType>(defaultErrorContext)
