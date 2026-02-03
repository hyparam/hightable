import type { ReactNode } from 'react'
import { useContext, useEffect, useEffectEvent, useMemo } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import { defaultOverscan } from '../helpers/constants.js'
import type { HighTableProps } from '../types.js'

type RowsAndColumnsProviderProps = Pick<HighTableProps, 'data' | 'onError' | 'overscan'> & {
  /** The actual number of rows in the data frame */
  numRows: number
  /** Children elements */
  children: ReactNode
}

/**
 * Provide the column parameters, through the RowsAndColumnsContext, and fetch the required rows (visible + overscan).
 */
export function RowsAndColumnsProvider({ data, numRows, overscan = defaultOverscan, onError, children }: RowsAndColumnsProviderProps) {
  const { visibleRowsStart, visibleRowsEnd } = useContext(ScrollContext)

  const { orderBy } = useContext(OrderByContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const fetchedRowsStart = useMemo(() => {
    if (visibleRowsStart === undefined) return undefined
    return Math.max(0, visibleRowsStart - overscan)
  }, [visibleRowsStart, overscan])

  const fetchedRowsEnd = useMemo(() => {
    if (visibleRowsEnd === undefined) return undefined
    return Math.min(numRows, visibleRowsEnd + overscan)
  }, [visibleRowsEnd, numRows, overscan])

  const columnNames = useMemo(() => {
    return columnsParameters.map(({ name }) => name)
  }, [columnsParameters])

  // Call onError (if provided) when a fetch fails.
  // Not in the effect directly to avoid having to add onError to the effect dependencies,
  // and canceling and re-creating fetches if onError changes.
  const onFetchError = useEffectEvent((error: unknown) => {
    onError?.(error)
  })

  // Fetch rows when parameters change.
  // Keep this inside an effect so we don't update state
  // or perform side-effects during render, for example when calling onError.
  useEffect(() => {
    if (data.fetch === undefined || fetchedRowsStart === undefined || fetchedRowsEnd === undefined) return

    // Create an AbortController per fetch and clean it up on dependency changes.
    const abortController = new AbortController()

    // Launch the data fetch. The promise is not awaited here, but it will be aborted if any dependency changes.
    data.fetch({
      rowStart: fetchedRowsStart,
      rowEnd: fetchedRowsEnd,
      columns: columnNames,
      orderBy,
      signal: abortController.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }
      onFetchError(error)
    })

    return () => {
      abortController.abort()
    }
  }, [data, fetchedRowsStart, fetchedRowsEnd, columnNames, orderBy])

  const value = useMemo(() => ({
    columnsParameters,
  }), [columnsParameters])

  return (
    <RowsAndColumnsContext.Provider value={value}>
      {children}
    </RowsAndColumnsContext.Provider>
  )
}
