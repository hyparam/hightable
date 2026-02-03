import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import type { Cell } from '../contexts/CellNavigationContext.js'
import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import type { HighTableProps } from '../types.js'

type CellNavigationProviderProps = Pick<HighTableProps, 'focus'> & {
  /** The actual number of rows in the data frame */
  numRows: number
  /** Children elements */
  children: ReactNode
}

/**
 * Provide the cell navigation state and logic to the table, through the CellNavigationContext.
 */
export function CellNavigationProvider({ children, numRows: numDataRows, focus = true }: CellNavigationProviderProps) {
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

  const value = useMemo(() => {
    return {
      cell,
      colCount,
      rowCount,
      focusCurrentCell,
      goToCell,
      goToFirstCell,
      scrollAndFocusCurrentCell,
    }
  }, [cell, colCount, rowCount, focusCurrentCell, goToCell, goToFirstCell, scrollAndFocusCurrentCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
