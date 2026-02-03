import { useEffect, useState } from 'react'

import type { DataFrame } from '../helpers/dataframe/index.js'
import type { HighTableProps } from '../types.js'

/**
 * Provides the dataId, version and numRows states derived from the data frame.
 */
export function useData({ data }: Pick<HighTableProps, 'data'>) {
  // dataId can be used as a "key" to trigger remounts when the data frame changes
  // Note that key={dataId} must be a string or a number, so: we cannot use data directly
  const [dataId, setDataId] = useState<number>(0)
  const [previousData, setPreviousData] = useState<DataFrame>(data)

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

  // If a new data frame is passed, set dataId (used to remount child components), and
  // reset the state: version and numRows
  if (data !== previousData) {
    setDataId(d => d + 1)
    setPreviousData(data)
    setVersion(0)
    setNumRows(data.numRows)
  }

  return {
    dataId,
    version,
    numRows,
  }
}
