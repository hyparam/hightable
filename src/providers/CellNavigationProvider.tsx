import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import type { DataFrame } from '../helpers/dataframe/index.js'

export interface CellNavigationProviderProps {
  focus?: boolean // whether to focus the first cell on mount
}

type Props = {
  children: ReactNode
} & CellNavigationProviderProps

export function CellNavigationProvider({ children, focus = true }: Props) {
  const [colIndex, setColIndex] = useState(defaultCellNavigationContext.colIndex)
  const [rowIndex, setRowIndex] = useState(defaultCellNavigationContext.rowIndex)
  const [shouldFocus, setShouldFocus] = useState(false)
  const [lastData, setLastData] = useState<Omit<DataFrame, 'numRows'> | undefined>(undefined)
  const { data } = useContext(DataContext)

  // number of rows in the table, including the header row
  const { numRows: numDataRows } = useContext(DataContext)
  const rowCount = numDataRows + 1
  const [previousRowCount, setPreviousRowCount] = useState(rowCount)

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnVisibilityStatesContext)
  const colCount = numDataColumns + 1
  const [previousColCount, setPreviousColCount] = useState(colCount)

  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (rowCount !== previousRowCount) {
    setPreviousRowCount(rowCount)
    if (rowIndex > rowCount) {
      // Reset the row index to the last row if it goes out of bounds
      // TODO(SL): scroll and/or focus?
      setRowIndex(rowCount)
    }
  }
  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (colCount !== previousColCount) {
    setPreviousColCount(colCount)
    if (colIndex > colCount) {
      // Reset the column index to the last column if it goes out of bounds
      // Note that we don't force scrolling or focusing
      setColIndex(colCount)
    }
  }

  const focusFirstCell = useCallback(() => {
    setColIndex(1)
    setRowIndex(1)
    setShouldFocus(true)
    // No need to scroll to it, the top left column is always visible.
  }, [])

  // Focus the first cell on mount, or on later changes, so keyboard navigation works
  if (data !== lastData) {
    setLastData(data)
    if (focus) {
      focusFirstCell()
    }
  }

  const value = useMemo(() => {
    return {
      colCount,
      colIndex,
      rowCount,
      rowIndex,
      setColIndex,
      setRowIndex,
      shouldFocus,
      setShouldFocus,
      focusFirstCell,
    }
  }, [colCount, colIndex, rowCount, rowIndex, shouldFocus, focusFirstCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
