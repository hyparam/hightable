import type { SetStateAction } from 'react'
import { createContext } from 'react'

interface CellNavigationContextType {
  colCount: number // total number of columns in the table
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowCount: number // total number of rows in the table
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
  shouldFocus: boolean // true if the current cell should be focused
  setColIndex: (value: SetStateAction<number>) => void // function to set the column index
  setRowIndex: (value: number) => void // function to set the row index. No need for SetStateAction here, as we only call it with a number
  setShouldFocus: (shouldFocus: boolean) => void // function to set the shouldFocus state
  focusFirstCell: () => void // function to focus the first cell
}

// the default context assumes a one-cell table (the top left corner is always present)
export const defaultCellNavigationContext: CellNavigationContextType = {
  colCount: 1,
  colIndex: 1,
  rowCount: 1,
  rowIndex: 1,
  shouldFocus: false,
  setColIndex: () => { /* no-op */ },
  setRowIndex: () => { /* no-op */ },
  setShouldFocus: () => { /* no-op */ },
  focusFirstCell: () => { /* no-op */ },
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
