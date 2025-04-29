import { KeyboardEvent, ReactNode, RefObject, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface FocusContextType {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
  onKeyDown: (event: KeyboardEvent) => void // function to handle keydown events. It is created only once and does not change when the focus changes.
  setColIndex: (colIndex: number) => void // function to set the column index
  setRowIndex: (rowIndex: number) => void // function to set the row index
}

const defaultFocusContext: FocusContextType = {
  colIndex: 1, // the focus is initially on the top-left cell
  rowIndex: 1, // the focus is initially on the top-left cell
  onKeyDown: () => { /* no-op */ },
  setColIndex: () => { /* no-op */ },
  setRowIndex: () => { /* no-op */ },
}

export const FocusContext = createContext<FocusContextType>(defaultFocusContext)

interface FocusProviderProps {
  colCount: number // number of columns in the table, same semantic as aria-colcount (includes row headers)
  rowCount: number // number of rows in the table, same semantic as aria-rowcount (includes column headers)
  children: ReactNode
}

export function FocusProvider({ colCount, rowCount, children }: FocusProviderProps) {
  const [colIndex, setColIndex] = useState(1)
  const [rowIndex, setRowIndex] = useState(1)

  const onKeyDown = useCallback((event: KeyboardEvent) => {
    // avoid scrolling the table when the user is navigating with the keyboard
    event.stopPropagation()
    event.preventDefault()
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
      setRowIndex((prev) => prev < rowCount ? prev + 1 : prev)
    } else if (key === 'ArrowUp') {
      setRowIndex((prev) => prev > 1 ? prev - 1 : prev)
    } else if (key === 'Home') {
      if (event.ctrlKey) {
        setRowIndex(1)
      }
      setColIndex(1)
    } else if (key === 'End') {
      setColIndex(colCount)
    }
  }, [colCount, rowCount])

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
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  )
}

interface CellData {
  ref: RefObject<HTMLElement | null> // ref to the HTML element
  ariaColIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  ariaRowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0 // -1 if the cell is not focused, 0 if it is focused
interface CellFocus {
  tabIndex: TabIndex // -1 if the cell is not focused, 0 if it is focused
  focusCell: () => void // function to set the focus on the cell
}

export function useCellFocus({ ref, ariaColIndex, ariaRowIndex }: CellData): CellFocus {
  const { colIndex, rowIndex, setColIndex, setRowIndex } = useContext(FocusContext)

  const cell = ariaColIndex === 1 && ariaRowIndex === 1

  // Check if the cell is focused
  const isFocused = ariaColIndex === colIndex && ariaRowIndex === rowIndex

  useEffect(() => {
    // set the focus on the cell when needed
    if (ref.current && isFocused && document.activeElement !== ref.current) {
      ref.current.focus()
    }
  }, [ref, isFocused, ariaColIndex, ariaRowIndex, cell])

  const tabIndex = isFocused ? 0 : -1 // -1 if the cell is not focused, 0 if it is focused

  const focusCell = useCallback(() => {
    setColIndex(ariaColIndex)
    setRowIndex(ariaRowIndex)
  }, [setColIndex, setRowIndex, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    focusCell,
  }
}

export function useFocus(): FocusContextType {
  return useContext(FocusContext)
}
