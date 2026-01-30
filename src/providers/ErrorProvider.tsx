import { useMemo } from 'react'

import { ErrorContext } from '../contexts/ErrorContext.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'onError'> & {
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
