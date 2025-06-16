import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrameV2, arrayDataFrame } from '../helpers/dataframeV2.js'
import { isValidRowNumber } from '../helpers/row.js'

interface DataContextType {
  data: DataFrameV2,
  numRows: number,
  key: string,
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    numRows: 0,
    key: 'default',
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps {
  data: DataFrameV2,
  onError: (error: Error) => void
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

export function DataProvider({ children, onError, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrameV2>(data)
  const [numRows, setNumRows] = useState(data.numRows)

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
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
