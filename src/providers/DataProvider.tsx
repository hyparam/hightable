import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { DataContext } from '../contexts/DataContext.js'
import type { DataFrame } from '../helpers/dataframe/index.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'data' | 'maxRowNumber'> & {
  children: ReactNode
}

/**
 * Provides the data frame and related state to the table, through the DataContext.
 */
export function DataProvider({ children, data, maxRowNumber: propMaxRowNumber }: Props) {
  // The key helps trigger remounts when the data frame changes
  const [key, setKey] = useState<number>(0)
  const [previousData, setPreviousData] = useState<DataFrame>(data)
  const [version, setVersion] = useState(0)
  const [numRows, setNumRows] = useState(data.numRows)

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

  if (data !== previousData) {
    setKey(prevKey => prevKey + 1)
    setPreviousData(data)
    setVersion(0)
    setNumRows(data.numRows)
  }

  const maxRowNumber = useMemo(() => {
    return propMaxRowNumber ?? numRows
  }, [propMaxRowNumber, numRows])

  return (
    <DataContext.Provider value={{
      data,
      key,
      version,
      maxRowNumber,
      numRows,
    }}
    >
      {children}
    </DataContext.Provider>
  )
}
