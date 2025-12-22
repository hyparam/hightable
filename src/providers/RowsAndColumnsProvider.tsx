import type { ReactNode } from 'react'
import { useContext, useMemo, useState } from 'react'

import { defaultPadding } from '../components/HighTable/constants.js'
import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import type { RowsRange } from '../contexts/RowsAndColumnsContext.js'
import { RowsAndColumnsContext } from '../contexts/RowsAndColumnsContext.js'

export interface RowsAndColumnsProviderProps {
  padding?: number
}

type Props = {
  children: ReactNode
} & RowsAndColumnsProviderProps

export function RowsAndColumnsProvider({ padding = defaultPadding, children }: Props) {
  const [rowsRange, setRowsRange] = useState<RowsRange | undefined>(undefined)

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

  const fetchOptions = useMemo(() => ({
    orderBy,
    columnsParameters,
    rowsRange,
    abortController: new AbortController(),
  }), [orderBy, columnsParameters, rowsRange])
  const [lastFetchOptions, setLastFetchOptions] = useState(fetchOptions)

  // fetch the rows if needed
  // (it does not include change in onError, which is a detail,
  //  or in data, which would retrigger a full remount of the provider with key)
  // No need for useEffect
  if (
    lastFetchOptions.orderBy !== orderBy
    || lastFetchOptions.rowsRange !== rowsRange
    || lastFetchOptions.columnsParameters !== columnsParameters
  ) {
    lastFetchOptions.abortController.abort()
    setLastFetchOptions(fetchOptions)
    if (data.fetch !== undefined && rowsRange !== undefined) {
      data.fetch({
        rowStart: rowsRange.start,
        rowEnd: rowsRange.end,
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

  const rowsRangeWithPadding = useMemo(() => {
    if (!rowsRange) return undefined

    const startPadding = Math.max(rowsRange.start - padding, 0)
    const endPadding = Math.min(rowsRange.end + padding, numRows)
    return {
      ...rowsRange,
      startPadding,
      endPadding,
    }
  }, [rowsRange, numRows, padding])

  const value = useMemo(() => ({
    columnsParameters,
    rowsRangeWithPadding,
    setRowsRange,
  }), [columnsParameters, rowsRangeWithPadding, setRowsRange])

  return (
    <RowsAndColumnsContext.Provider value={value}>
      {children}
    </RowsAndColumnsContext.Provider>
  )
}
