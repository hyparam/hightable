import { KeyboardEvent, ReactNode, RefObject, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface CellsNavigationContextType {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
  onKeyDown?: (event: KeyboardEvent) => void // function to handle keydown events. It is created only once.
  setColIndex?: (colIndex: number) => void // function to set the column index
  setRowIndex?: (rowIndex: number) => void // function to set the row index
}

const defaultCellsNavigationContext: CellsNavigationContextType = {
  colIndex: 1, // the cursor cell is initially the top-left cell
  rowIndex: 1, //
  onKeyDown: undefined,
  setColIndex: undefined,
  setRowIndex: undefined,
}

export const CellsNavigationContext = createContext<CellsNavigationContextType>(defaultCellsNavigationContext)

interface CellsNavigationProviderProps {
  colCount: number // number of columns in the table, same semantic as aria-colcount (includes row headers)
  rowCount: number // number of rows in the table, same semantic as aria-rowcount (includes column headers)
  rowPadding: number // number of rows to skip when navigating with the keyboard
  children: ReactNode
}

export function CellsNavigationProvider({ colCount, rowCount, rowPadding, children }: CellsNavigationProviderProps) {
  const [colIndex, setColIndex] = useState(1)
  const [rowIndex, setRowIndex] = useState(1)

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event

    if (key === 'ArrowRight') {
      if (event.ctrlKey) {
        setColIndex(colCount)
      } else {
        setColIndex((prev) => prev < colCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowLeft') {
      if (event.ctrlKey) {
        setColIndex(1)
      } else {
        setColIndex((prev) => prev > 1 ? prev - 1 : prev)
      }
    } else if (key === 'ArrowDown') {
      if (event.ctrlKey) {
        setRowIndex(rowCount)
      } else {
        setRowIndex((prev) => prev < rowCount ? prev + 1 : prev)
      }
    } else if (key === 'ArrowUp') {
      if (event.ctrlKey) {
        setRowIndex(1)
      } else {
        setRowIndex((prev) => prev > 1 ? prev - 1 : prev)
      }
    } else if (key === 'Home') {
      if (event.ctrlKey) {
        setRowIndex(1)
      }
      setColIndex(1)
    } else if (key === 'End') {
      if (event.ctrlKey) {
        setRowIndex(rowCount)
      }
      setColIndex(colCount)
    } else if (key === 'PageDown') {
      setRowIndex((prev) => prev + rowPadding <= rowCount ? prev + rowPadding : rowCount )
    } else if (key === 'PageUp') {
      setRowIndex((prev) => prev - rowPadding >= 1 ? prev - rowPadding : 1)
    } else {
      // if the key is not one of the above, do not handle it
      return
    }
    // avoid scrolling the table when the user is navigating with the keyboard
    event.stopPropagation()
    event.preventDefault()
  }, [colCount, rowCount, rowPadding])

  const value = useMemo(() => {
    return {
      colIndex,
      rowIndex,
      onKeyDown,
      setColIndex,
      setRowIndex,
    }
  }, [colIndex, rowIndex, onKeyDown])

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
  const { colIndex, rowIndex, setColIndex, setRowIndex } = useContext(CellsNavigationContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === colIndex && ariaRowIndex === rowIndex

  useEffect(() => {
    // focus on the cell when needed
    if (ref.current && isCurrentCell && document.activeElement !== ref.current) {
      ref.current.focus()
    }
  }, [ref, isCurrentCell, ariaColIndex, ariaRowIndex])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    setColIndex?.(ariaColIndex)
    setRowIndex?.(ariaRowIndex)
  }, [setColIndex, setRowIndex, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    navigateToCell,
  }
}

export function useCellsNavigation(): CellsNavigationContextType {
  return useContext(CellsNavigationContext)
}
