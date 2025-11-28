import { ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { DataFrame, Obj, arrayDataFrame } from '../helpers/dataframe/index.js'

interface DataContextType {
  data: Omit<DataFrame, 'numRows'>,
  key: string,
  version: number,
  maxRowNumber: number
  numRows: number
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    key: 'default',
    version: 0,
    maxRowNumber: 0,
    numRows: 0,
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps<M extends Obj, C extends Obj> {
  data: DataFrame<M, C>,
  maxRowNumber?: number,
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

export function DataProvider<M extends Obj, C extends Obj>({ children, data, maxRowNumber: propMaxRowNumber }: DataProviderProps<M, C>) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame<M, C>>(data)
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
    setKey(getRandomKey())
    setPreviousData(data)
    setVersion(0)
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
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
