import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrame, DataFrameSimple, fromArray } from '../helpers/dataframe/index.js'

interface DataContextType {
  data: DataFrame | DataFrameSimple,
  key: string,
  version: number,
}

function getDefaultDataContext(): DataContextType {
  return {
    data: fromArray([]),
    key: 'default',
    version: 0,
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps {
  data: DataFrame | DataFrameSimple,
  onError: (error: Error) => void
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

function isValidNumRows(row: number): boolean {
  return Number.isInteger(row) && row >= 0
}

export function DataProvider({ children, onError, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame | DataFrameSimple>(data)
  const [previousNumRows, setPreviousNumRows] = useState<number>(data.numRows)
  const [version, setVersion] = useState(0)

  if (!isValidNumRows(data.numRows)) {
    throw new Error(`Invalid numRows: ${data.numRows}. It must be a non-negative integer.`)
  }
  if (data.numRows !== previousNumRows) {
    throw new Error(`Data numRows changed from ${previousNumRows} to ${data.numRows}. This is not allowed. You must create a new DataFrame instance.`)
  }

  useEffect(() => {
    function onUpdate() {
      setVersion(prev => prev + 1)
    }
    data.eventTarget?.addEventListener('resolve', onUpdate)
    data.eventTarget?.addEventListener('dataframe:update', onUpdate)
    data.eventTarget?.addEventListener('dataframe:index:update', onUpdate)
    return () => {
      data.eventTarget?.removeEventListener('resolve', onUpdate)
      data.eventTarget?.removeEventListener('dataframe:update', onUpdate)
      data.eventTarget?.removeEventListener('dataframe:index:update', onUpdate)
    }
  }, [data, onError])

  if (data !== previousData) {
    setKey(getRandomKey())
    setPreviousData(data)
    setPreviousNumRows(data.numRows)
    setVersion(0)
  }

  return (
    <DataContext.Provider value={{
      data,
      key,
      version,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
