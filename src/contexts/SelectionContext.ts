import type { KeyboardEvent } from 'react'
import { createContext } from 'react'

interface SelectionContextType {
  /** True if all rows are selected, false if none are selected, undefined if the selection is not defined. */
  allRowsSelected?: boolean
  /** True if a selection gesture is pending, meaning that the selection is being modified */
  pendingSelectionGesture?: boolean
  /** True if rows can be selected */
  selectable?: boolean
  /**
   * Function to check if a row is selected
   *
   * @param rowNumber The row number to check (0-based, rowNumber=0 is the first data row)
   * @returns True if the row is selected, false if it is not selected, and undefined if the selection is not defined.
   */
  isRowSelected?: ({ rowNumber }: { rowNumber: number | undefined }) => boolean | undefined
  /**
   * Function to call when a key is pressed on the table
   *
   * @param event The keyboard event
   */
  onTableKeyDown?: (event: KeyboardEvent) => void
  /**
   * Function to toggle all rows in the table
   *
   * undefined if the selection or the onSelectionChange callback are not defined.
   */
  toggleAllRows?: () => void
  /**
   * Function to toggle the selection of all the rows between the anchor (if any) to the
   * given row.
   *
   * undefined if the selection or the onSelectionChange callback are not defined.
   *
   * Note that both row and rowNumber are provided to avoid recomputing one from the other.
   *
   * @param row The row index to toggle to (0-based, data rows only). It's the row index in the ordered/sorted data.
   * @param rowNumber The row number to toggle to (0-based, data rows only). It's the row index in the original data.
   */
  toggleRangeToRowNumber?: ({ row, rowNumber }: { row: number, rowNumber: number }) => void
  /**
   * Function to toggle a row in the selection by its row number
   *
   * undefined if the selection or the onSelectionChange callback are not defined.
   *
   * @param rowNumber The row number to toggle (0-based, data rows only)
   */
  toggleRowNumber?: ({ rowNumber }: { rowNumber: number }) => void
}

export const defaultSelectionContext: SelectionContextType = {}

export const SelectionContext = createContext<SelectionContextType>(defaultSelectionContext)
