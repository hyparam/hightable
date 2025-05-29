import { ReactNode, createContext, useContext, useState } from 'react'
import { DataFrame } from '../helpers/dataframe.js'

interface DataContextType {
  data: DataFrame,
  key: string,
}

function getDefaultDataContext(): DataContextType {
  return {
    data: {
      numRows: 0,
      header: [],
      rows: () => [],
    },
    key: 'default',
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

export function DataProvider({ children, data }: DataProviderProps) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame>(data)

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
