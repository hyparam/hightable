import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrame, arrayDataFrame } from '../helpers/dataframe/index.js'

interface DataContextType {
  data: DataFrame,
  key: string,
  version: number,
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    key: 'default',
    version: 0,
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps {
  data: DataFrame,
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

// function isValidNumRows(row: number): boolean {
//   return Number.isInteger(row) && row >= 0
// }

export function DataProvider({ children, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame>(data)
  const [version, setVersion] = useState(0)

  // TODO(SL): restore once we better handle error? (create an ErrorBoundary context -> call onError() and provide a default data context?)
  // const [previousNumRows, setPreviousNumRows] = useState<number>(data.numRows)
  // if (!isValidNumRows(data.numRows)) {
  //   throw new Error(`Invalid numRows: ${data.numRows}. It must be a non-negative integer.`)
  // }
  // if (data.numRows !== previousNumRows) {
  //   throw new Error(`Data numRows changed from ${previousNumRows} to ${data.numRows}. This is not allowed. You must create a new DataFrame instance.`)
  // }

  useEffect(() => {
    function onResolve() {
      setVersion(prev => prev + 1)
    }
    data.eventTarget?.addEventListener('resolve', onResolve)
    return () => {
      data.eventTarget?.removeEventListener('resolve', onResolve)
    }
  }, [data])

  if (data !== previousData) {
    setKey(getRandomKey())
    setPreviousData(data)
    // setPreviousNumRows(data.numRows)
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
