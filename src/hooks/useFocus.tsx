import { KeyboardEvent, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'

interface FocusContextType {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
  onKeyDown: (event: KeyboardEvent) => void // function to handle keydown events. It is created only once and does not change when the focus changes.
}

const defaultFocusContext: FocusContextType = {
  colIndex: 1, // the focus is initially on the top-left cell
  rowIndex: 1, // the focus is initially on the top-left cell
  onKeyDown: () => {
    // no-op
  },
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
    const { key } = event
    if (key === 'ArrowRight') {
      setColIndex((prev) => prev < colCount ? prev + 1 : prev)
    } else if (key === 'ArrowLeft') {
      setColIndex((prev) => prev > 1 ? prev - 1 : prev)
    } else if (key === 'ArrowDown') {
      setRowIndex((prev) => prev < rowCount ? prev + 1 : prev)
    } else if (key === 'ArrowUp') {
      setRowIndex((prev) => prev > 1 ? prev - 1 : prev)
    }
  }, [colCount, rowCount])

  const value = useMemo(() => {
    return {
      colIndex,
      rowIndex,
      onKeyDown,
    }
  }, [colIndex, rowIndex, onKeyDown])

  return (
    <FocusContext.Provider value={value}>
      {children}
    </FocusContext.Provider>
  )
}

interface CellPosition {
  colIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  rowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0 // -1 if the cell is not focused, 0 if it is focused

export function useTabIndex(): ({ colIndex, rowIndex }: CellPosition) => TabIndex {
  const focus = useContext(FocusContext)
  return useCallback(({ colIndex, rowIndex }: CellPosition): TabIndex => {
    // Check if the cell is focused
    const isFocused = colIndex === focus.colIndex && rowIndex === focus.rowIndex
    return isFocused ? 0 : -1 // -1 if the cell is not focused, 0 if it is focused
  }, [focus.rowIndex, focus.colIndex])
}
