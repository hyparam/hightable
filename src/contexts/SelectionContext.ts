import { createContext, KeyboardEvent } from 'react'

interface SelectionContextType {
  selectable?: boolean // true if the selection is defined
  pendingSelectionGesture?: boolean // true if a gesture is pending, meaning that the selection is being modified
  isRowSelected?: ({ rowNumber }: { rowNumber: number | undefined }) => boolean | undefined // function to check if a row is selected. Returns true if the row is selected, false if it is not selected, and undefined if the selection is not defined.
  toggleRowNumber?: ({ rowNumber }: { rowNumber: number }) => void // function to toggle a row in the selection by its row number. undefined if the selection or the onSelectionChange callback are not defined.
  toggleRangeToRowNumber?: ({ row, rowNumber }: { row: number, rowNumber: number }) => void // function to toggle a range to the row number. undefined if the selection or the onSelectionChange callback are not defined.
  onTableKeyDown?: (event: KeyboardEvent) => void // callback to call when a key is pressed on the table.
  toggleAllRows?: () => void // toggle all rows in the table. undefined if the selection or the onSelectionChange callback are not defined.
  allRowsSelected?: boolean // true if all rows are selected, false if none are selected, undefined if the selection is not defined.
}

export const defaultSelectionContext: SelectionContextType = {}

export const SelectionContext = createContext<SelectionContextType>(defaultSelectionContext)
