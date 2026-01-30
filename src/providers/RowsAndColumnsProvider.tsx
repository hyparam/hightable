import type { ReactNode } from 'react'
import { useContext, useMemo, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import { defaultOverscan } from '../helpers/constants.js'
import type { HighTableProps } from '../types.js'

type RowsAndColumnsProviderProps = Pick<HighTableProps, 'overscan'> & {
  /** Children elements */
  children: ReactNode
}

/**
 * Provide the column parameters, through the RowsAndColumnsContext, and fetch the required rows (visible + overscan).
 */
export function RowsAndColumnsProvider({ overscan = defaultOverscan, children }: RowsAndColumnsProviderProps) {
  const { visibleRowsStart, visibleRowsEnd } = useContext(ScrollContext)

  const { onError } = useContext(ErrorContext)
  const { data, numRows } = useContext(DataContext)
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

  const fetchOptions = useMemo(() => ({
    orderBy,
    columnsParameters,
    fetchedRowsStart,
    fetchedRowsEnd,
    abortController: new AbortController(),
  }), [orderBy, columnsParameters, fetchedRowsStart, fetchedRowsEnd])
  const [lastFetchOptions, setLastFetchOptions] = useState(fetchOptions)

  // fetch the rows if needed
  // (it does not include change in onError, which is a detail,
  //  or in data, which would retrigger a full remount of the provider with key)
  if (
    lastFetchOptions.orderBy !== orderBy
    || lastFetchOptions.fetchedRowsStart !== fetchedRowsStart
    || lastFetchOptions.fetchedRowsEnd !== fetchedRowsEnd
    || lastFetchOptions.columnsParameters !== columnsParameters
  ) {
    lastFetchOptions.abortController.abort()
    setLastFetchOptions(fetchOptions)
    if (data.fetch !== undefined && fetchedRowsStart !== undefined && fetchedRowsEnd !== undefined) {
      data.fetch({
        rowStart: fetchedRowsStart,
        rowEnd: fetchedRowsEnd,
        columns: columnsParameters.map(({ name }) => name),
        orderBy,
        signal: fetchOptions.abortController.signal,
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // fetch was aborted, ignore the error
          return
        }
        onError?.(error)
      })
    }
  }

  const value = useMemo(() => ({
    columnsParameters,
  }), [columnsParameters])

  return (
    <RowsAndColumnsContext.Provider value={value}>
      {children}
    </RowsAndColumnsContext.Provider>
  )
}
