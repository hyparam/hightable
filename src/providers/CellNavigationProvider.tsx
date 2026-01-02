import type { KeyboardEvent, ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../contexts/DataContext.js'

interface CellNavigationProviderProps {
  children: ReactNode
}

export function CellNavigationProvider({ children }: CellNavigationProviderProps) {
  const [colIndex, setColIndex] = useState(defaultCellNavigationContext.colIndex)
  const [rowIndex, setRowIndex] = useState(defaultCellNavigationContext.rowIndex)
  const [shouldFocus, setShouldFocus] = useState(false)
  const [shouldScroll, setShouldScroll] = useState(false)

  // number of rows in the table, including the header row
  const { numRows: numDataRows } = useContext(DataContext)
  const rowCount = numDataRows + 1
  const [previousRowCount, setPreviousRowCount] = useState(rowCount)

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnVisibilityStatesContext)
  const colCount = numDataColumns + 1
  const [previousColCount, setPreviousColCount] = useState(colCount)

  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (rowCount !== previousRowCount) {
    setPreviousRowCount(rowCount)
    if (rowIndex > rowCount) {
      // Reset the row index to the last row if it goes out of bounds
      // TODO(SL): scroll and/or focus?
      setRowIndex(rowCount)
    }
  }
  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (colCount !== previousColCount) {
    setPreviousColCount(colCount)
    if (colIndex > colCount) {
      // Reset the column index to the last column if it goes out of bounds
      // Note that we don't force scrolling or focusing
      setColIndex(colCount)
    }
  }

  const onTableKeyDown = useCallback((event: KeyboardEvent, { numRowsPerPage }: {
    numRowsPerPage: number // number of rows to skip when navigating with the keyboard (PageUp/PageDown)
  }) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event
    // if the user is pressing Alt, Meta or Shift, do not handle the event
    if (altKey || metaKey || shiftKey) {
      return
    }
    if (key === 'ArrowRight') {
      if (ctrlKey) {
        setColIndex(colCount)
      } else {
        setColIndex(prev => prev < colCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowLeft') {
      if (ctrlKey) {
        setColIndex(1)
      } else {
        setColIndex(prev => prev > 1 ? prev - 1 : prev)
      }
    } else if (key === 'ArrowDown') {
      if (ctrlKey) {
        setRowIndex(rowCount)
      } else {
        setRowIndex(prev => prev < rowCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowUp') {
      if (ctrlKey) {
        setRowIndex(1)
      } else {
        setRowIndex(prev => prev > 1 ? prev - 1 : prev)
      }
    } else if (key === 'Home') {
      if (ctrlKey) {
        setRowIndex(1)
      }
      setColIndex(1)
    } else if (key === 'End') {
      if (ctrlKey) {
        setRowIndex(rowCount)
      }
      setColIndex(colCount)
    } else if (key === 'PageDown') {
      setRowIndex(prev => prev + numRowsPerPage <= rowCount ? prev + numRowsPerPage : rowCount)
      // TODO(SL): same for horizontal scrolling with Alt+PageDown?
    } else if (key === 'PageUp') {
      setRowIndex(prev => prev - numRowsPerPage >= 1 ? prev - numRowsPerPage : 1)
      // TODO(SL): same for horizontal scrolling with Alt+PageUp?
    } else if (key !== ' ') {
      // if the key is not one of the above, do not handle it
      // special case: no action is associated with the Space key, but it's captured
      // anyway to prevent the default action (scrolling the page) and stay in navigation mode
      return
    }
    // avoid scrolling the table when the user is navigating with the keyboard
    event.stopPropagation()
    event.preventDefault()
    setShouldScroll(true)
    setShouldFocus(true)
  }, [colCount, rowCount])

  const focusFirstCell = useCallback(() => {
    setColIndex(1)
    setRowIndex(1)
    setShouldFocus(true)
    // No need to scroll to it, the top left column is always visible.
  }, [])

  const value = useMemo(() => {
    return {
      colIndex,
      rowIndex,
      onTableKeyDown,
      setColIndex,
      setRowIndex,
      shouldFocus,
      setShouldFocus,
      shouldScroll,
      setShouldScroll,
      focusFirstCell,
    }
  }, [colIndex, rowIndex, onTableKeyDown, shouldFocus, shouldScroll, focusFirstCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
