import type { ReactNode } from 'react'
import { useContext, useMemo, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'
import { ScrollModeContext } from '../contexts/ScrollModeContext.js'
import { defaultOverscan } from '../helpers/constants.js'

export interface RowsAndColumnsProviderProps {
  overscan?: number // number of rows to fetch beyond the visible table cells (default 20)
}

type Props = {
  children: ReactNode
} & RowsAndColumnsProviderProps

export function RowsAndColumnsProvider({ overscan = defaultOverscan, children }: Props) {
  const { visibleRowsRange } = useContext(ScrollModeContext)

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

  const fetchedRowsRange = useMemo(() => {
    if (!visibleRowsRange) return undefined

    return {
      start: Math.max(0, visibleRowsRange.start - overscan),
      end: Math.min(numRows, visibleRowsRange.end + overscan),
    }
  }, [visibleRowsRange, numRows, overscan])

  const fetchOptions = useMemo(() => ({
    orderBy,
    columnsParameters,
    fetchedRowsRange,
    abortController: new AbortController(),
  }), [orderBy, columnsParameters, fetchedRowsRange])
  const [lastFetchOptions, setLastFetchOptions] = useState(fetchOptions)

  // fetch the rows if needed
  // (it does not include change in onError, which is a detail,
  //  or in data, which would retrigger a full remount of the provider with key)
  if (
    lastFetchOptions.orderBy !== orderBy
    || lastFetchOptions.fetchedRowsRange !== fetchedRowsRange
    || lastFetchOptions.columnsParameters !== columnsParameters
  ) {
    lastFetchOptions.abortController.abort()
    setLastFetchOptions(fetchOptions)
    if (data.fetch !== undefined && fetchedRowsRange !== undefined) {
      data.fetch({
        rowStart: fetchedRowsRange.start,
        rowEnd: fetchedRowsRange.end,
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
