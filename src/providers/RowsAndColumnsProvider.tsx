import type { ReactNode } from 'react'
import { useContext, useMemo, useState } from 'react'

import { defaultOverscan, defaultPadding } from '../components/HighTable/constants.js'
import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import type { RowsRange } from '../contexts/RowsAndColumnsContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'

export interface RowsAndColumnsProviderProps {
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of empty placeholder rows to render beyond the fetched data range
}

type Props = {
  children: ReactNode
} & RowsAndColumnsProviderProps

export function RowsAndColumnsProvider({ padding = defaultPadding, overscan = defaultOverscan, children }: Props) {
  const [visibleRowsRange, setVisibleRowsRange] = useState<RowsRange | undefined>(undefined)

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
  const renderedRowsRange = useMemo(() => {
    if (!fetchedRowsRange) return undefined

    return {
      start: Math.max(0, fetchedRowsRange.start - padding),
      end: Math.min(numRows, fetchedRowsRange.end + padding),
    }
  }, [fetchedRowsRange, numRows, padding])

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
  // No need for useEffect
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
    visibleRowsRange,
    renderedRowsRange,
    fetchedRowsRange,
    setVisibleRowsRange,
  }), [columnsParameters, fetchedRowsRange, setVisibleRowsRange, renderedRowsRange, visibleRowsRange])

  return (
    <RowsAndColumnsContext.Provider value={value}>
      {children}
    </RowsAndColumnsContext.Provider>
  )
}
