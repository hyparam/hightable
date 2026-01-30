import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

interface RowsAndColumnsContextType {
  /** Parameters for columns */
  columnsParameters?: ColumnParameters[]
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
