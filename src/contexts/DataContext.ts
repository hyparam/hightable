import { createContext } from 'react'

import type { DataFrame } from '../helpers/dataframe/index.js'
import { arrayDataFrame } from '../helpers/dataframe/index.js'

interface DataContextType {
  data: Omit<DataFrame, 'numRows'>,
  key: number,
  version: number,
  maxRowNumber: number
  numRows: number
}

function getDefaultDataContext(): DataContextType {
  return {
    data: arrayDataFrame([]),
    key: 0,
    version: 0,
    maxRowNumber: 0,
    numRows: 0,
  }
}

export const DataContext = createContext<DataContextType>(getDefaultDataContext())
