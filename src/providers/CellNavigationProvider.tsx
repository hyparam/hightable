import { KeyboardEvent, ReactNode, useCallback, useMemo, useState } from 'react'

import { CellNavigationContext, defaultCellNavigationContext } from '../contexts/CellNavigationContext'

interface CellNavigationProviderProps {
  colCount: number // number of columns in the table, same semantic as aria-colcount (includes row headers)
  rowCount: number // number of rows in the table, same semantic as aria-rowcount (includes column headers)
  rowPadding: number // number of rows to skip when navigating with the keyboard
  children: ReactNode
}

export function CellNavigationProvider({ colCount, rowCount, rowPadding, children }: CellNavigationProviderProps) {
  const [previousRowCount, setPreviousRowCount] = useState(rowCount)
  const [colIndex, setColIndex] = useState(defaultCellNavigationContext.cellPosition.colIndex)
  const [rowIndex, setRowIndex] = useState(defaultCellNavigationContext.cellPosition.rowIndex)
  const [shouldFocus, setShouldFocus] = useState(false)
  const [shouldScroll, setShouldScroll] = useState(false)

  // Reset the cell position if the number of rows has decreased and the current row index is out of bounds
  if (rowCount !== previousRowCount) {
    setPreviousRowCount(rowCount)
    if (rowIndex > rowCount) {
      // Reset the row index to the last row if it goes out of bounds
      // Note that we don't force scrolling or focusing
      setRowIndex(rowCount)
    }
  }

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event
    // if the user is pressing Alt, Meta or Shift, do not handle the event
    if (altKey || metaKey || shiftKey) {
      return
    }
    if (key === 'ArrowRight') {
      if (ctrlKey) {
        setColIndex(colCount)
      } else {
        setColIndex((prev) => prev < colCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowLeft') {
      if (ctrlKey) {
        setColIndex(1)
      } else {
        setColIndex((prev) => prev > 1 ? prev - 1 : prev)
      }
    } else if (key === 'ArrowDown') {
      if (ctrlKey) {
        setRowIndex(rowCount)
      } else {
        setRowIndex((prev) => prev < rowCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowUp') {
      if (ctrlKey) {
        setRowIndex(1)
      } else {
        setRowIndex((prev) => prev > 1 ? prev - 1 : prev)
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
      setRowIndex((prev) => prev + rowPadding <= rowCount ? prev + rowPadding : rowCount )
    } else if (key === 'PageUp') {
      setRowIndex((prev) => prev - rowPadding >= 1 ? prev - rowPadding : 1)
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
  }, [colCount, rowCount, rowPadding])

  const onScrollKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event
    // the user can scroll with the keyboard using the arrow keys.
    // Only handle the Tab, Enter and Space keys, to enter the cell navigation mode
    // TODO(SL): exclude other meta keys
    if (key === 'Tab' && !event.shiftKey || key === 'Enter' || key === ' ') {
      // avoid scrolling the table when the user is navigating with the keyboard
      event.stopPropagation()
      event.preventDefault()
      setShouldScroll(true)
      setShouldFocus(true)
    }
  }, [])

  const focusFirstCell = useCallback(() => {
    setColIndex(defaultCellNavigationContext.cellPosition.colIndex)
    setRowIndex(defaultCellNavigationContext.cellPosition.rowIndex)
    setShouldScroll(true)
    setShouldFocus(true)
  }, [])

  const cellPosition = useMemo(() => {
    return {
      colIndex,
      rowIndex,
    }
  }, [colIndex, rowIndex])

  const value = useMemo(() => {
    return {
      cellPosition,
      onTableKeyDown,
      onScrollKeyDown,
      setColIndex,
      setRowIndex,
      shouldFocus,
      setShouldFocus,
      shouldScroll,
      setShouldScroll,
      focusFirstCell,
    }
  }, [cellPosition, onTableKeyDown, onScrollKeyDown, shouldFocus, shouldScroll, focusFirstCell])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
