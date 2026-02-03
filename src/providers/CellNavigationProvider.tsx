import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import type { Cell, MoveCellAction } from '../contexts/CellNavigationContext.js'
import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import { defaultNumRowsPerPage } from '../helpers/constants.js'
import type { HighTableProps } from '../types.js'

type CellNavigationProviderProps = Pick<HighTableProps, 'focus' | 'numRowsPerPage'> & {
  /** The actual number of rows in the data frame */
  numRows: number
  /** Children elements */
  children: ReactNode
}

/**
 * Provide the cell navigation state and logic to the table, through the CellNavigationContext.
 */
export function CellNavigationProvider({
  numRows: numDataRows,
  numRowsPerPage = defaultNumRowsPerPage,
  focus = true,
  children,
}: CellNavigationProviderProps) {
  const [cell, setCell] = useState<Cell>(defaultCellNavigationContext.cell)
  const [focusedOnMount, setFocusedOnMount] = useState(false)

  // TODO(SL): this state should be removed, and a state should be added in useCellFocus,
  // since the logic in React is to describe UI state through props and not through imperative code.
  const [shouldFocus, setShouldFocus] = useState(false)
  // for scrolling the cell into view. This provider must be used inside a ScrollProvider
  const { isScrollingProgrammatically, scrollRowIntoView } = useContext(ScrollContext)

  // number of rows in the table, including the header row
  const rowCount = useMemo(() => numDataRows + 1, [numDataRows])

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnVisibilityStatesContext)
  const colCount = useMemo(() => numDataColumns + 1, [numDataColumns])

  const scrollAndFocusCell = useCallback((cell: Cell) => {
    scrollRowIntoView?.({ rowIndex: cell.rowIndex })
    // after scrolling, focus the cell (and scroll horizontally into view if needed - see focusCurrentCell)
    setShouldFocus(true)
  }, [scrollRowIntoView])

  const goToCell = useCallback((cell: Cell) => {
    setCell(cell)
    scrollAndFocusCell(cell)
  }, [scrollAndFocusCell])

  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (cell.rowIndex > rowCount) {
    // Reset the row index to the last row if it goes out of bounds
    goToCell({ colIndex: cell.colIndex, rowIndex: rowCount })
  }
  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (cell.colIndex > colCount) {
    // Reset the column index to the last column if it goes out of bounds
    goToCell({ colIndex: colCount, rowIndex: cell.rowIndex })
  }

  const goToFirstCell = useCallback(() => {
    goToCell({ colIndex: 1, rowIndex: 1 })
  }, [goToCell])

  const scrollAndFocusCurrentCell = useCallback(() => {
    scrollAndFocusCell(cell)
  }, [scrollAndFocusCell, cell])

  // Focus the current cell on mount so keyboard navigation works
  // It happens every time the data frame changes, if the provider key= is set to dataId
  // On mount, the current cell is the (default) top left cell (1, 1), which always exists
  if (focus && !focusedOnMount) {
    scrollAndFocusCurrentCell()
    setFocusedOnMount(true)
  }

  const focusCurrentCell = useMemo(() => {
    if (!shouldFocus || isScrollingProgrammatically) {
      return
    }
    return (element: HTMLElement) => {
      // horizontally scroll the cell into view and focus it, once the row is rendered and scrolled into view vertically
      // (thanks to the scrollRowIntoView function)
      //
      // scroll-padding-inline-start is set in the CSS
      // to avoid the cell being hidden by the row headers
      //
      // we don't use the simpler form:
      //   element.focus()
      // due to its default scroll behavior. After focusing the elements, it scrolls it into view using `inline: center`.
      // But `inline: nearest` feels more natural for navigation. So, we use scrollIntoView first, then focus with `preventScroll: true`.
      element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
      element.focus({ preventScroll: true })
      setShouldFocus(false)
    }
  }, [isScrollingProgrammatically, shouldFocus])

  // TODO(SL): don't depend on cell, decoupling cell update from scrolling/focusing
  const moveCell = useCallback((action: MoveCellAction) => {
    switch (action.type) {
      case 'LAST_COLUMN': {
        goToCell({ colIndex: colCount, rowIndex: cell.rowIndex })
        break
      }
      case 'NEXT_COLUMN': {
        const newColIndex = cell.colIndex < colCount ? cell.colIndex + 1 : colCount
        goToCell({ colIndex: newColIndex, rowIndex: cell.rowIndex })
        break
      }
      case 'FIRST_COLUMN': {
        goToCell({ colIndex: 1, rowIndex: cell.rowIndex })
        break
      }
      case 'PREVIOUS_COLUMN': {
        const newColIndex = cell.colIndex > 1 ? cell.colIndex - 1 : 1
        goToCell({ colIndex: newColIndex, rowIndex: cell.rowIndex })
        break
      }
      case 'LAST_ROW': {
        goToCell({ colIndex: cell.colIndex, rowIndex: rowCount })
        break
      }
      case 'NEXT_ROW': {
        const newRowIndex = cell.rowIndex < rowCount ? cell.rowIndex + 1 : rowCount
        goToCell({ colIndex: cell.colIndex, rowIndex: newRowIndex })
        break
      }
      case 'FIRST_ROW': {
        goToCell({ colIndex: cell.colIndex, rowIndex: 1 })
        break
      }
      case 'PREVIOUS_ROW': {
        const newRowIndex = cell.rowIndex > 1 ? cell.rowIndex - 1 : 1
        goToCell({ colIndex: cell.colIndex, rowIndex: newRowIndex })
        break
      }
      case 'FIRST_CELL': {
        goToCell({ colIndex: 1, rowIndex: 1 })
        break
      }
      case 'LAST_CELL': {
        goToCell({ colIndex: colCount, rowIndex: rowCount })
        break
      }
      case 'NEXT_ROWS_PAGE': {
        const newRowIndex = Math.min(cell.rowIndex + numRowsPerPage, rowCount)
        goToCell({ colIndex: cell.colIndex, rowIndex: newRowIndex })
        break
      }
      case 'PREVIOUS_ROWS_PAGE': {
        const newRowIndex = Math.max(cell.rowIndex - numRowsPerPage, 1)
        goToCell({ colIndex: cell.colIndex, rowIndex: newRowIndex })
        break
      }
      case 'CELL': {
        goToCell({ colIndex: action.colIndex, rowIndex: action.rowIndex })
        break
      }
    }
  }, [cell, goToCell, colCount, rowCount, numRowsPerPage])

  const value = useMemo(() => {
    return {
      cell,
      colCount,
      rowCount,
      focusCurrentCell,
      moveCell,
      goToFirstCell,
      scrollAndFocusCurrentCell,
    }
  }, [cell, colCount, rowCount, focusCurrentCell, moveCell, goToFirstCell, scrollAndFocusCurrentCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
