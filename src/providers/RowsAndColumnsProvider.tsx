import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import type { ColumnParametersContextType } from '../contexts/ColumnParametersContext.js'
import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import type { OrderByContextType } from '../contexts/OrderByContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import type { RowsRange } from '../contexts/RowsAndColumnsContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'

interface FetchOptions {
  columnsParameters: ColumnParametersContextType
  orderBy: OrderByContextType['orderBy']
  rowsRange: RowsRange | undefined
}

interface RowsAndColumnsProviderProps {
  children: ReactNode
}

export function RowsAndColumnsProvider({ children }: RowsAndColumnsProviderProps) {
  const [rowsRange, setRowsRange] = useState<RowsRange | undefined>(undefined)
  const [abortController, setAbortController] = useState<AbortController | undefined>(undefined)

  const { onError } = useContext(ErrorContext)
  const { data } = useContext(DataContext)
  const { orderBy } = useContext(OrderByContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const fetchOptions = useMemo(() => ({
    orderBy, columnsParameters, rowsRange,
  }), [orderBy, columnsParameters, rowsRange])
  const [lastFetchOptions, setLastFetchOptions] = useState(fetchOptions)

  const fetchRows = useCallback(({
    rowsRange,
    orderBy,
    columnsParameters,
  }: FetchOptions) => {
    if (data.fetch === undefined || rowsRange === undefined) {
      return
    }
    // abort the previous fetches if any
    abortController?.abort()
    const nextAbortController = new AbortController()
    setAbortController(nextAbortController)
    // fetch data when needed
    data.fetch({
      rowStart: rowsRange.start,
      rowEnd: rowsRange.end,
      columns: columnsParameters.map(({ name }) => name),
      orderBy,
      signal: nextAbortController.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fetch was aborted, ignore the error
        return
      }
      onError?.(error)
    })
  }, [abortController, setAbortController, onError, data])

  if ((lastFetchOptions.orderBy !== orderBy
    || lastFetchOptions.rowsRange !== rowsRange
    || lastFetchOptions.columnsParameters !== columnsParameters)) {
    // fetch the rows if needed
    // (it does not include change in onError, which is a detail,
    //  or in data, which would retrigger a full remount of the provider with key)
    setLastFetchOptions(fetchOptions)
    fetchRows(fetchOptions)
  }

  const value = useMemo(() => ({
    columnsParameters,
    rowsRange,
    setRowsRange,
  }), [columnsParameters, rowsRange, setRowsRange])

  return (
    <RowsAndColumnsContext.Provider value={value}>
      {children}
    </RowsAndColumnsContext.Provider>
  )
}
