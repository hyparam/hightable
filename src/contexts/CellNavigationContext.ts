import { createContext } from 'react'

/**
 * A cell in the table, identified by its column and row indices.
 */
export interface Cell {
  /**
   * The column index of the cell
   *
   * It's the same semantic as aria-colindex: 1-based, includes row headers
   */
  colIndex: number
  /**
   * The row index of the cell
   *
   * It's the same semantic as aria-rowindex: 1-based, includes column headers
   */
  rowIndex: number
}

interface CellNavigationContextType {
  /** The current (active) cell in the table. Defaults to the top-left cell (1, 1) */
  cell: Cell
  /** The total number of columns in the table */
  colCount: number
  /** The total number of rows in the table */
  rowCount: number
  // TODO(SL): change the logic, as React props should describe data, not actions
  /**
   * Focus the current cell.
   *
   * If the current cell does not need to be focused, the function is undefined.
   *
   * @param element The HTML element of the current cell
   */
  focusCurrentCell?: (element: HTMLElement) => void // function to focus the current cell, if needed
  /**
   * Go to a specific cell in the table.
   *
   * The table scrolls to and focuses the cell, even if the cell is unchanged.
   *
   * @param value The cell to go to
   */
  goToCell: (value: Cell) => void
  /**
   * Go to the first cell in the table (1, 1).
   *
   * This function scrolls to and focuses the first cell, even if the cell is unchanged.
   */
  goToFirstCell: () => void
  /**
   * Scroll to and focus the current (active) cell.
   */
  scrollAndFocusCurrentCell: () => void
}

// the default context assumes a one-cell table (the top left corner is always present)
export const defaultCellNavigationContext: CellNavigationContextType = {
  cell: { colIndex: 1, rowIndex: 1 },
  colCount: 1,
  rowCount: 1,
  focusCurrentCell: undefined,
  goToCell: () => { /* no-op */ },
  goToFirstCell: () => { /* no-op */ },
  scrollAndFocusCurrentCell: () => { /* no-op */ },
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
