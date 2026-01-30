import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { DataContext } from '../contexts/DataContext.js'
import type { DataFrame } from '../helpers/dataframe/index.js'

export interface DataProviderProps {
  /** A data frame */
  data: DataFrame
  /** The maximum number of rows to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied. */
  maxRowNumber?: number
}

type Props = DataProviderProps & {
  children: ReactNode
}

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
