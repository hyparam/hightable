import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useRef, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import type { RowsRange } from '../contexts/RowsAndColumnsContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'

interface RowsAndColumnsProviderProps {
  children: ReactNode
}

export function RowsAndColumnsProvider({ children }: RowsAndColumnsProviderProps) {
  const abortControllerRef = useRef<AbortController | undefined>(undefined)

  const [rowsRange, _setRowsRange] = useState<RowsRange | undefined>(undefined)

  const { data } = useContext(DataContext)
  const { onError } = useContext(ErrorContext)
  const { orderBy } = useContext(OrderByContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const fetchRows = useCallback(({
    rowsRange: { start, end },
  }: {
    rowsRange: { start: number, end: number }
  }) => {
    if (data.fetch === undefined) {
      return
    }
    // abort the previous fetches if any
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    // fetch data when needed
    data.fetch({
      rowStart: start,
      rowEnd: end,
      columns: columnsParameters.map(({ name }) => name),
      orderBy,
      signal: abortController.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fetch was aborted, ignore the error
        return
      }
      onError?.(error)
    })
  }, [data, orderBy, onError, columnsParameters])

  const setRowsRange = useCallback((newRowsRange: RowsRange | undefined) => {
    _setRowsRange((rowsRange) => {
      if (
        newRowsRange && (
          rowsRange !== newRowsRange
          || rowsRange.start !== newRowsRange.start
          || rowsRange.end !== newRowsRange.end
        )) {
        // new rows range, let's fetch data
        fetchRows({ rowsRange: newRowsRange })
      }
      return newRowsRange
    })
  }, [fetchRows])

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
