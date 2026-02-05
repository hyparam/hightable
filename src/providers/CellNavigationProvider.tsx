import type { ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import type { MoveCellAction } from '../contexts/CellNavigationContext.js'
import { CellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { defaultNumRowsPerPage } from '../helpers/constants.js'
import { useInputState } from '../hooks/useInputState.js'
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
  focus = true,
  numRows: numDataRows,
  numRowsPerPage = defaultNumRowsPerPage,
  children,
}: CellNavigationProviderProps) {
  const [shouldFocus, setShouldFocus] = useState(focus)
  const [shouldScroll, setShouldScroll] = useState(focus)
  const acknowledgeScroll = useCallback(() => {
    setShouldScroll(false)
  }, [])

  const notifyChange = useCallback(() => {
    setShouldFocus(true)
    setShouldScroll(true)
  }, [])

  // restart scroll + focus process when the cell position changes,
  // to ensure the cell is scrolled into view and focused when it changes.
  const [cellPosition, goToCell] = useInputState({
    initialUncontrolledValue: { colIndex: 1, rowIndex: 1 },
    notifyChange,
  })

  // number of rows in the table, including the header row
  const rowCount = useMemo(() => numDataRows + 1, [numDataRows])

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnVisibilityStatesContext)
  const colCount = useMemo(() => numDataColumns + 1, [numDataColumns])

  const goToCurrentCell = useCallback(() => {
    // force set
    goToCell?.({ ...cellPosition })
  }, [goToCell, cellPosition])

  const goToFirstCell = useMemo(() => {
    if (goToCell) {
      return () => {
        goToCell({ colIndex: 1, rowIndex: 1 })
      }
    }
  }, [goToCell])

  useEffect(() => {
    if (
      cellPosition.rowIndex < 1
      || cellPosition.rowIndex > rowCount
      || cellPosition.colIndex < 1
      || cellPosition.colIndex > colCount
    ) {
      // move the cell inside the bounds (if possible)
      goToCell?.({
        colIndex: Math.min(Math.max(cellPosition.colIndex, 1), colCount),
        rowIndex: Math.min(Math.max(cellPosition.rowIndex, 1), rowCount),
      })
    }
  }, [cellPosition, rowCount, colCount, goToCell])

  const focusCurrentCell = useMemo(() => {
    if (shouldFocus) {
      return (element: HTMLElement) => {
        // horizontally scroll the cell into view and focus it, once the row is rendered and scrolled into view vertically
        // vertical scrolling happens automatically in ScrollProvider's useEffect when cellPosition changes
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
    }
  }, [shouldFocus])

  const moveCell = useMemo(() => {
    if (goToCell) {
      const { rowIndex, colIndex } = cellPosition
      return (action: MoveCellAction) => {
        switch (action.type) {
          case 'LAST_COLUMN': {
            goToCell({ colIndex: colCount, rowIndex })
            break
          }
          case 'NEXT_COLUMN': {
            const newColIndex = colIndex < colCount ? colIndex + 1 : colCount
            goToCell({ colIndex: newColIndex, rowIndex })
            break
          }
          case 'FIRST_COLUMN': {
            goToCell({ colIndex: 1, rowIndex })
            break
          }
          case 'PREVIOUS_COLUMN': {
            const newColIndex = colIndex > 1 ? colIndex - 1 : 1
            goToCell({ colIndex: newColIndex, rowIndex })
            break
          }
          case 'LAST_ROW': {
            goToCell({ colIndex, rowIndex: rowCount })
            break
          }
          case 'NEXT_ROW': {
            const newRowIndex = rowIndex < rowCount ? rowIndex + 1 : rowCount
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'FIRST_ROW': {
            goToCell({ colIndex, rowIndex: 1 })
            break
          }
          case 'PREVIOUS_ROW': {
            const newRowIndex = rowIndex > 1 ? rowIndex - 1 : 1
            goToCell({ colIndex, rowIndex: newRowIndex })
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
            const newRowIndex = Math.min(rowIndex + numRowsPerPage, rowCount)
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'PREVIOUS_ROWS_PAGE': {
            const newRowIndex = Math.max(rowIndex - numRowsPerPage, 1)
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'CELL': {
            goToCell({ colIndex: action.colIndex, rowIndex: action.rowIndex })
            break
          }
        }
      }
    }
  }, [cellPosition, goToCell, colCount, rowCount, numRowsPerPage])

  const value = useMemo(() => {
    return {
      cellPosition,
      colCount,
      rowCount,
      focusCurrentCell,
      moveCell,
      goToFirstCell,
      goToCurrentCell,
      shouldScroll,
      acknowledgeScroll,
    }
  }, [cellPosition, colCount, rowCount, focusCurrentCell, moveCell, goToFirstCell, goToCurrentCell, shouldScroll, acknowledgeScroll])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
