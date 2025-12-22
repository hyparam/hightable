import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

export interface RowsRange {
  start: number
  end: number
}

interface RowsRangeWithPadding extends RowsRange {
  startPadding: number // starting row index (inclusive) of the padded region before `start` (i.e. start - padding rows, or 0)
  endPadding: number // ending row index (exclusive) of the padded region (i.e. end + padding rows, or numRows)
}

interface RowsAndColumnsContextType {
  columnsParameters?: ColumnParameters[]
  rowsRangeWithPadding?: RowsRangeWithPadding
  setRowsRange?: (rowsRange: RowsRange | undefined) => void
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
