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

export interface FocusState {
  /**
   * Status of the focus process: the cell must first be scrolled vertically into view, if needed,
   * and then focused. This state is used to coordinate the scroll and focus processes, and
   * avoid focusing the cell before it is scrolled into view vertically.
   */
  status:
    | 'idle'
    | 'should_scroll_into_view'
    | 'scrolling_into_view'
    | 'should_focus'
  /**
   * Counter to avoid infinite loops in the scroll-focus process, in case the scroll or focus actions don't work for some reason.
   */
  counter: number
}
export type FocusAction
  = | { type: 'START' }
    | { type: 'CANNOT_SCROLL_YET' }
    | { type: 'LOCAL_SCROLLING_STARTED' }
    | { type: 'GLOBAL_SCROLLING_STARTED' }
    | { type: 'SCROLLED_EVENT_RECEIVED' }
    | { type: 'NO_NEED_TO_SCROLL' }
    | { type: 'FOCUSED' }

interface CellNavigationContextType {
  /** The current position of the navigation cell, with 1-based indices (including headers) */
  cellPosition: CellPosition
  /** The total number of columns in the table */
  colCount: number
  /** The total number of rows in the table */
  rowCount: number
  /** State of the scroll+focus process */
  focusState: FocusState
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
  /**
   * Dispatch a focus action to update the focus state.
   */
  focusDispatch?: (action: FocusAction) => void
}

// the default context assumes a one-cell table (the top left corner is always present)
export const defaultCellNavigationContext: CellNavigationContextType = {
  cellPosition: { colIndex: 1, rowIndex: 1 },
  colCount: 1,
  rowCount: 1,
  focusState: { status: 'idle', counter: 0 },
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
