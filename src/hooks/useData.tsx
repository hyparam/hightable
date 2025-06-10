import { ReactNode, createContext, useContext, useState } from 'react'
import { DataFrameV2, arrayDataFrame } from '../helpers/dataframeV2.js'

interface DataContextType {
  data: DataFrameV2,
  key: string,
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    key: 'default',
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())

interface DataProviderProps {
  data: DataFrameV2,
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

export function DataProvider({ children, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrameV2>(data)

  if (data !== previousData) {
    setKey(getRandomKey())
    setPreviousData(data)
  }

  return (
    <DataContext.Provider value={{
      data,
      key,
    }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}
