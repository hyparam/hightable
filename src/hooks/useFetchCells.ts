import { useContext, useEffect, useEffectEvent, useMemo } from 'react'

import { ColumnsVisibilityContext } from '../contexts/ColumnsVisibilityContext.js'
import { DataFrameMethodsContext, NumRowsContext } from '../contexts/DataContext.js'
import { OrderByContext } from '../contexts/OrderByContext.js'
import { defaultOverscan } from '../helpers/constants.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'onError' | 'overscan'> & {
  range?: {
    /** Index of the first row visible in the viewport (inclusive). Indexes refer to the virtual table domain. */
    visibleRowsStart?: number
    /** Index of the last row visible in the viewport (exclusive). */
    visibleRowsEnd?: number
  }
}

/**
 * Fetch the required cells (visible + overscan).
 */
export function useFetchCells({ overscan = defaultOverscan, range = {}, onError }: Props) {
  const { visibleColumnsParameters } = useContext(ColumnsVisibilityContext)
  const orderBy = useContext(OrderByContext)
  const dataFrameMethods = useContext(DataFrameMethodsContext)
  const numRows = useContext(NumRowsContext)
  const { visibleRowsStart, visibleRowsEnd } = range

  const fetchedRowsStart = visibleRowsStart === undefined ? undefined : Math.max(0, visibleRowsStart - overscan)
  const fetchedRowsEnd = visibleRowsEnd === undefined ? undefined : Math.min(numRows, visibleRowsEnd + overscan)

  const columnNames = useMemo(() => {
    return (visibleColumnsParameters ?? []).map(({ name }) => name)
  }, [visibleColumnsParameters])

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
    if (dataFrameMethods.fetch === undefined || fetchedRowsStart === undefined || fetchedRowsEnd === undefined) return

    // Create an AbortController per fetch and clean it up on dependency changes.
    const abortController = new AbortController()

    // Launch the data fetch. The promise is not awaited here, but it will be aborted if any dependency changes.
    dataFrameMethods.fetch({
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
  }, [dataFrameMethods, fetchedRowsStart, fetchedRowsEnd, columnNames, orderBy])
}
