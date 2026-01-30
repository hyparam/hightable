import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import type { Cell } from '../contexts/CellNavigationContext.js'
import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'
import { ScrollContext } from '../contexts/ScrollContext.js'
import type { DataFrame } from '../helpers/dataframe/index.js'

export interface CellNavigationProviderProps {
  focus?: boolean // whether to focus the first cell on mount
}

type Props = {
  children: ReactNode
} & CellNavigationProviderProps

export function CellNavigationProvider({ children, focus = true }: Props) {
  const [cell, setCell] = useState<Cell>(defaultCellNavigationContext.cell)
  const [shouldFocus, setShouldFocus] = useState(false)
  const [lastData, setLastData] = useState<Omit<DataFrame, 'numRows'> | undefined>(undefined)
  const { data } = useContext(DataContext)
  // for scrolling the cell into view. This provider must be used inside a ScrollProvider
  const { isScrollingProgrammatically, scrollRowIntoView } = useContext(ScrollContext)

  // number of rows in the table, including the header row
  const { numRows: numDataRows } = useContext(DataContext)
  const rowCount = useMemo(() => numDataRows + 1, [numDataRows])
  const [previousRowCount, setPreviousRowCount] = useState(rowCount)

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnVisibilityStatesContext)
  const colCount = useMemo(() => numDataColumns + 1, [numDataColumns])
  const [previousColCount, setPreviousColCount] = useState(colCount)

  const goToCell = useCallback((value: Cell) => {
    const colIndex = Math.min(Math.max(1, value.colIndex), colCount)
    const rowIndex = Math.min(Math.max(1, value.rowIndex), rowCount)

    setCell({ colIndex, rowIndex })
    scrollRowIntoView?.({ rowIndex })
    // after scrolling, focus the cell (and scroll horizontally into view if needed - see focusCurrentCell)
    setShouldFocus(true)
  }, [scrollRowIntoView, colCount, rowCount])

  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (rowCount !== previousRowCount) {
    setPreviousRowCount(rowCount)
    if (cell.rowIndex > rowCount) {
      // Reset the row index to the last row if it goes out of bounds
      goToCell({ colIndex: cell.colIndex, rowIndex: rowCount })
    }
  }
  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (colCount !== previousColCount) {
    setPreviousColCount(colCount)
    if (cell.colIndex > colCount) {
      // Reset the column index to the last column if it goes out of bounds
      goToCell({ colIndex: colCount, rowIndex: cell.rowIndex })
    }
  }

  const goToFirstCell = useCallback(() => {
    goToCell({ colIndex: 1, rowIndex: 1 })
  }, [goToCell])

  const goToCurrentCell = useCallback(() => {
    goToCell(cell)
  }, [goToCell, cell])

  // Focus the first cell on mount, or on later changes, so keyboard navigation works
  if (data !== lastData) {
    setLastData(data)
    if (focus) {
      goToFirstCell()
    }
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
      goToCurrentCell,
      goToFirstCell,
    }
  }, [cell, colCount, rowCount, focusCurrentCell, goToCell, goToCurrentCell, goToFirstCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
