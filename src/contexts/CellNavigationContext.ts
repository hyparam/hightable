import { createContext } from 'react'

import type { CellPosition } from '../types'

export type MoveCellAction = {
  type:
    | 'FIRST_COLUMN' | 'PREVIOUS_COLUMN' | 'NEXT_COLUMN' | 'LAST_COLUMN'
    | 'FIRST_ROW' | 'PREVIOUS_ROW' | 'NEXT_ROW' | 'LAST_ROW'
    | 'FIRST_CELL' | 'LAST_CELL'
    | 'NEXT_ROWS_PAGE' | 'PREVIOUS_ROWS_PAGE'
} | {
  type: 'CELL'
  colIndex: number
  rowIndex: number
}

interface CellNavigationContextType {
  /** The current position of the navigation cell, with 1-based indices (including headers) */
  cellPosition: CellPosition
  /** The total number of columns in the table */
  colCount: number
  /** The total number of rows in the table */
  rowCount: number
  /**
   * Focus the current cell.
   *
   * If the current cell does not need to be focused, the function is undefined.
   *
   * @param element The HTML element of the current cell
   */
  focusCurrentCell?: (element: HTMLElement) => void // function to focus the current cell, if needed
  /**
   * Move the current cell.
   *
   * The table scrolls to and focuses the cell, even if the cell is unchanged.
   *
   * @param action The action to move the cell
   */
  moveCell?: (action: MoveCellAction) => void
  /**
   * Go to the first cell in the table (1, 1).
   *
   * This function scrolls to and focuses the first cell, even if the cell is unchanged.
   */
  goToFirstCell?: () => void
  /**
   * Scroll to and focus the current (active) cell.
   */
  goToCurrentCell?: () => void
}

// the default context assumes a one-cell table (the top left corner is always present)
export const defaultCellNavigationContext: CellNavigationContextType = {
  cellPosition: { colIndex: 1, rowIndex: 1 },
  colCount: 1,
  rowCount: 1,
  focusCurrentCell: undefined,
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
