import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import type { ColumnParametersContextType } from '../contexts/ColumnParametersContext.js'
import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import type { DataContextType } from '../contexts/DataContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import type { OrderByContextType } from '../contexts/OrderByContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import type { RowsRange } from '../contexts/RowsAndColumnsContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'

interface FetchOptions {
  columnsParameters: ColumnParametersContextType
  data: DataContextType['data']
  orderBy: OrderByContextType['orderBy']
}

interface RowsAndColumnsProviderProps {
  children: ReactNode
}

export function RowsAndColumnsProvider({ children }: RowsAndColumnsProviderProps) {
  const [rowsRange, _setRowsRange] = useState<RowsRange | undefined>(undefined)
  const [abortController, setAbortController] = useState<AbortController | undefined>(undefined)

  const { onError } = useContext(ErrorContext)

  const fetchRows = useCallback(({
    rowsRange: { start, end },
    fetchOptions: { data, orderBy, columnsParameters },
  }: {
    rowsRange: { start: number, end: number }
    fetchOptions: FetchOptions
  }) => {
    if (data.fetch === undefined) {
      return
    }
    // abort the previous fetches if any
    abortController?.abort()
    const nextAbortController = new AbortController()
    setAbortController(nextAbortController)
    // fetch data when needed
    data.fetch({
      rowStart: start,
      rowEnd: end,
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
  }, [abortController, setAbortController, onError])

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
    data, orderBy, columnsParameters,
  }), [data, orderBy, columnsParameters])
  const [lastFetchOptions, setLastFetchOptions] = useState(fetchOptions)

  if ((lastFetchOptions.data !== data
    || lastFetchOptions.orderBy !== orderBy
    || lastFetchOptions.columnsParameters !== columnsParameters)) {
    // reset rowsRange when any of the fetch options change
    setLastFetchOptions(fetchOptions)
    if (rowsRange !== undefined) {
      fetchRows({ rowsRange, fetchOptions })
    }
  }

  const setRowsRange = useCallback((newRowsRange: RowsRange | undefined) => {
    _setRowsRange((rowsRange) => {
      if (
        newRowsRange && (
          rowsRange?.start !== newRowsRange.start
          || rowsRange.end !== newRowsRange.end
        )) {
        // new rows range, let's fetch data
        fetchRows({ rowsRange: newRowsRange, fetchOptions })
      }
      return newRowsRange
    })
  }, [fetchRows, fetchOptions])

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
