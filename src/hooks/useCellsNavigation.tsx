import { KeyboardEvent, ReactNode, RefObject, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export interface CellPosition {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}

interface CellsNavigationContextType {
  cellPosition: CellPosition
  shouldFocus: boolean // true if the current cell should be focused
  enterCellsNavigation?: boolean // true if entering cells navigation mode
  onTableKeyDown?: (event: KeyboardEvent) => void // function to handle keydown events inside the table. It is created only once.
  onScrollKeyDown?: (event: KeyboardEvent) => void // function to handle keydown events outside the table, in the scroll wrapper. It is created only once.
  setColIndex?: (colIndex: number) => void // function to set the column index
  setRowIndex?: (rowIndex: number) => void // function to set the row index
  setShouldFocus?: (shouldFocus: boolean) => void // function to set the shouldFocus state
  setEnterCellsNavigation?: (enterCellsNavigation: boolean) => void // function to set the enterCellsNavigation state
  focusFirstCell?: () => void // function to focus the first cell
}

const defaultCellsNavigationContext: CellsNavigationContextType = {
  cellPosition: {
    colIndex: 1, // the cursor cell is initially the top-left cell
    rowIndex: 1, //
  },
  shouldFocus: false,
  enterCellsNavigation: false,
  onTableKeyDown: undefined,
  onScrollKeyDown: undefined,
  setColIndex: undefined,
  setRowIndex: undefined,
  setShouldFocus: undefined,
  setEnterCellsNavigation: undefined,
}

export const CellsNavigationContext = createContext<CellsNavigationContextType>(defaultCellsNavigationContext)

interface CellsNavigationProviderProps {
  colCount: number // number of columns in the table, same semantic as aria-colcount (includes row headers)
  rowCount: number // number of rows in the table, same semantic as aria-rowcount (includes column headers)
  rowPadding: number // number of rows to skip when navigating with the keyboard
  children: ReactNode
}

export function CellsNavigationProvider({ colCount, rowCount, rowPadding, children }: CellsNavigationProviderProps) {
  const [colIndex, setColIndex] = useState(defaultCellsNavigationContext.cellPosition.colIndex)
  const [rowIndex, setRowIndex] = useState(defaultCellsNavigationContext.cellPosition.rowIndex)
  const [shouldFocus, setShouldFocus] = useState(false)
  const [enterCellsNavigation, setEnterCellsNavigation] = useState(false)

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
      setEnterCellsNavigation(true)
      setShouldFocus(true)
    }
  }, [])

  const focusFirstCell = useCallback(() => {
    setColIndex(defaultCellsNavigationContext.cellPosition.colIndex)
    setRowIndex(defaultCellsNavigationContext.cellPosition.rowIndex)
    setEnterCellsNavigation(true)
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
      enterCellsNavigation,
      setEnterCellsNavigation,
      focusFirstCell,
    }
  }, [cellPosition, onTableKeyDown, onScrollKeyDown, shouldFocus, enterCellsNavigation,
    setEnterCellsNavigation, focusFirstCell])

  return (
    <CellsNavigationContext.Provider value={value}>
      {children}
    </CellsNavigationContext.Provider>
  )
}

interface CellData {
  ref: RefObject<HTMLElement | null> // ref to the HTML element
  ariaColIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  ariaRowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0 // roving tabindex: -1 for all cells except the current navigation cell, which is 0
interface CellFocus {
  tabIndex: TabIndex
  navigateToCell: () => void
}

export function useCellNavigation({ ref, ariaColIndex, ariaRowIndex }: CellData): CellFocus {
  const { cellPosition: { colIndex, rowIndex }, setColIndex, setRowIndex, shouldFocus, setShouldFocus } = useContext(CellsNavigationContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === colIndex && ariaRowIndex === rowIndex
  const isHeaderCell = ariaRowIndex === 1 || ariaColIndex === 1

  useEffect(() => {
    // focus on the cell when needed
    if (ref.current && isCurrentCell && shouldFocus) {
      if (!isHeaderCell) {
        // scroll the cell into view
        //
        // scroll-padding-inline-start and scroll-padding-block-start are set in the CSS
        // to avoid the cell being hidden by the row and column headers
        //
        // not applied for header cells, as they are always visible, and it was causing jumps when resizing a column
        ref.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
      }
      ref.current.focus()
      setShouldFocus?.(false)
    }
  }, [ref, isCurrentCell, isHeaderCell, shouldFocus, setShouldFocus])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    setColIndex?.(ariaColIndex)
    setRowIndex?.(ariaRowIndex)
    setShouldFocus?.(true)
  }, [setColIndex, setRowIndex, setShouldFocus, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    navigateToCell,
  }
}

export function useCellsNavigation(): CellsNavigationContextType {
  return useContext(CellsNavigationContext)
}
