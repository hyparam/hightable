import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

export interface RowsRange {
  start: number
  end: number
}

interface RowsRangeWithPadding extends RowsRange {
  startPadding: number // offset before start
  endPadding: number // offset after end
}

interface RowsAndColumnsContextType {
  columnsParameters?: ColumnParameters[]
  rowsRangeWithPadding?: RowsRangeWithPadding
  setRowsRange?: (rowsRange: RowsRange | undefined) => void
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
