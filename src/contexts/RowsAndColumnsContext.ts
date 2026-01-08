import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

interface RowsAndColumnsContextType {
  columnsParameters?: ColumnParameters[]
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
