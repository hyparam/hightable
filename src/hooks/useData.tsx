import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrame, arrayDataFrame } from '../helpers/dataframe/index.js'

interface DataContextType {
  data: DataFrame,
  numRows: number,
  key: string,
  version: number,
}

function isValidRowNumber(row: unknown): row is number {
  return typeof row === 'number' && Number.isInteger(row) && row >= 0
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    numRows: 0,
    key: 'default',
    version: 0,
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps {
  data: DataFrame,
  onError: (error: Error) => void
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

export function DataProvider({ children, onError, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame>(data)
  const [numRows, setNumRows] = useState(data.numRows)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    function onNumRowsChange(event: CustomEvent<{ numRows: number }>) {
      const { numRows: newNumRows } = event.detail
      if (!isValidRowNumber(newNumRows)) {
        onError(new Error(`Invalid number of rows: ${newNumRows}`))
        return
      }
      setNumRows(newNumRows)
    }
    data.eventTarget.addEventListener('dataframe:numrowschange', onNumRowsChange)
    return () => {
      data.eventTarget.removeEventListener('dataframe:numrowschange', onNumRowsChange)
    }
  }, [data, onError])

  useEffect(() => {
    function onUpdate() {
      setVersion(prev => prev + 1)
    }
    data.eventTarget.addEventListener('dataframe:update', onUpdate)
    data.eventTarget.addEventListener('dataframe:index:update', onUpdate)
    return () => {
      data.eventTarget.removeEventListener('dataframe:update', onUpdate)
      data.eventTarget.removeEventListener('dataframe:index:update', onUpdate)
    }
  }, [data, onError])

  if (data !== previousData) {
    setKey(getRandomKey())
    setPreviousData(data)
    setNumRows(data.numRows)
  }

  return (
    <DataContext.Provider value={{
      data,
      numRows,
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
