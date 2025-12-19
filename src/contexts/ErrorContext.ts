import { createContext } from 'react'

interface ErrorContextType {
  onError?: (error: unknown) => void
}

export const defaultErrorContext: ErrorContextType = {
  onError: console.error,
}

export const ErrorContext = createContext<ErrorContextType>(defaultErrorContext)
