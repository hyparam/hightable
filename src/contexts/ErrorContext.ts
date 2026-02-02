import { createContext } from 'react'

interface ErrorContextType {
  /** Optional callback to call when an error occurs (generally from a catch block). */
  onError?: (error: unknown) => void
  /** Function called to issue a warning message. */
  onWarn: (message: string) => void
}

export const defaultErrorContext: ErrorContextType = {
  onWarn: console.warn,
}

export const ErrorContext = createContext<ErrorContextType>(defaultErrorContext)
