import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

export interface RowsRange {
  start: number
  end: number
}

interface RowsAndColumnsContextType {
  columnsParameters?: ColumnParameters[]
  rowsRange?: RowsRange
  setRowsRange?: (rowsRange: RowsRange | undefined) => void
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
