import { createContext } from 'react'

import type { DataFrame } from '../helpers/dataframe/index.js'
import { arrayDataFrame } from '../helpers/dataframe/index.js'

export interface DataContextType {
  /** The data frame (without the number of rows, which is passed separately) */
  data: Omit<DataFrame, 'numRows'>
  /** A key that identifies a data frame. It increments whenever a new data frame object is passed. */
  key: number
  /** A version number that increments whenever a data frame is updated or resolved (the key remains the same). */
  version: number
  /** The maximum number of rows to display (for row headers). Useful for filtered data. */
  maxRowNumber: number
  /** The actual number of rows in the data frame. */
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
