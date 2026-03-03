import { type ReactNode, useEffect, useState } from 'react'

import { DataVersionContext, NumRowsContext } from '../contexts/DataContext.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'data'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Handles the viewport size (width and height) state.
 *
 * Provides the current viewport width and height via context, and a callback to update them.
 */
export function DataProvider({ children, data }: Props) {
  // Two data frame elements can change over time:
  // - version (if any cell or row number has resolved or changed)
  // - numRows.
  // We update them through effects below.
  // Note: we expect the rest of the data frame (columnDescriptors, exclusiveSort, fetch, etc)
  // to be immutable but we don't enforce it here, and we cannot react to their changes.
  const [version, setVersion] = useState(0)
  const [numRows, setNumRows] = useState(data.numRows)

  // Synchronize version and numRows with data frame events (external system - useEffect is needed)
  useEffect(() => {
    function onResolve() {
      setVersion(prev => prev + 1)
    }
    function onNumRowsChange() {
      setNumRows(data.numRows)
    }
    data.eventTarget?.addEventListener('numrowschange', onNumRowsChange)
    data.eventTarget?.addEventListener('resolve', onResolve)
    data.eventTarget?.addEventListener('update', onResolve)
    return () => {
      data.eventTarget?.removeEventListener('numrowschange', onNumRowsChange)
      data.eventTarget?.removeEventListener('resolve', onResolve)
      data.eventTarget?.removeEventListener('update', onResolve)
    }
  }, [data])

  // Multiple contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <DataVersionContext.Provider value={version}>
      <NumRowsContext.Provider value={numRows}>
        {children}
      </NumRowsContext.Provider>
    </DataVersionContext.Provider>
  )
}
