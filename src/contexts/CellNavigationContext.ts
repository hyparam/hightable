import { createContext } from 'react'

export interface Cell {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}

interface CellNavigationContextType {
  cell: Cell
  colCount: number // total number of columns in the table
  rowCount: number // total number of rows in the table
  focusCurrentCell?: (element: HTMLElement) => void // function to focus the current cell, if needed
  goToCell: (value: Cell) => void // function to go to cell. If out of bounds, it is clamped. It scrolls to and focuses the cell, even if the values are unchanged.
  goToCurrentCell: () => void // function to go to the current cell (navigation state).
  goToFirstCell: () => void // function to go to the first cell (1, 1)
}

// the default context assumes a one-cell table (the top left corner is always present)
export const defaultCellNavigationContext: CellNavigationContextType = {
  cell: { colIndex: 1, rowIndex: 1 },
  colCount: 1,
  rowCount: 1,
  focusCurrentCell: undefined,
  goToCell: () => { /* no-op */ },
  goToCurrentCell: () => { /* no-op */ },
  goToFirstCell: () => { /* no-op */ },
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
