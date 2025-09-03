import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrame, Obj, arrayDataFrame } from '../helpers/dataframe/index.js'

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

interface DataProviderProps<M extends Obj, C extends Obj> {
  data: DataFrame<M, C>,
  children: ReactNode
}

function getRandomKey(): string {
  return crypto.randomUUID()
}

export function DataProvider<M extends Obj, C extends Obj>({ children, data }: DataProviderProps<M, C>) {
  // We want a string key to identify the data.
  const [key, setKey] = useState<string>(getRandomKey())
  const [previousData, setPreviousData] = useState<DataFrame<M, C>>(data)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    // Check if the data has a registerCellListener (from useDataFrameCache)
    if (data.registerCellListener) {
      const unregister = data.registerCellListener(() => {
        setVersion(prev => prev + 1)
      })
      return unregister
    }
  }, [data])

  if (data !== previousData) {
    setKey(getRandomKey())
    setPreviousData(data)
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
