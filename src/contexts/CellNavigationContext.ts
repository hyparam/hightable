import { KeyboardEvent, createContext } from 'react'

export interface CellPosition {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}

interface CellNavigationContextType {
  cellPosition: CellPosition
  shouldFocus: boolean // true if the current cell should be focused
  shouldScroll: boolean // true if the table should scroll to the current cell
  onTableKeyDown?: (event: KeyboardEvent) => void // function to handle keydown events inside the table.
  onScrollKeyDown?: (event: KeyboardEvent) => void // function to handle keydown events outside the table, in the scroll wrapper.
  setColIndex?: (colIndex: number) => void // function to set the column index
  setRowIndex?: (rowIndex: number) => void // function to set the row index
  setShouldFocus?: (shouldFocus: boolean) => void // function to set the shouldFocus state
  setShouldScroll?: (shouldScroll: boolean) => void // function to set the shouldScroll state
  focusFirstCell?: () => void // function to focus the first cell
}

export const defaultCellNavigationContext: CellNavigationContextType = {
  cellPosition: {
    colIndex: 1, // the cursor cell is initially the top-left cell
    rowIndex: 1, //
  },
  shouldFocus: false,
  shouldScroll: false,
}

export const CellNavigationContext = createContext<CellNavigationContextType>(defaultCellNavigationContext)
