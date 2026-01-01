import { createContext } from 'react'

import type { ColumnParameters } from '../contexts/ColumnParametersContext.js'

export interface RowsRange {
  start: number // first row index (inclusive). Indexes refer to the virtual table domain.
  end: number // last row index (exclusive)
}

interface RowsAndColumnsContextType {
  columnsParameters?: ColumnParameters[]
  visibleRowsRange?: RowsRange // range of rows visible in the viewport
  fetchedRowsRange?: RowsRange // range of rows fetched from the data source
  renderedRowsRange?: RowsRange // range of rows rendered in the DOM as table rows
  setVisibleRowsRange?: (rowsRange: RowsRange | undefined) => void
}

export const defaultRowsAndColumnsContext: RowsAndColumnsContextType = {}

export const RowsAndColumnsContext = createContext<RowsAndColumnsContextType>(defaultRowsAndColumnsContext)
