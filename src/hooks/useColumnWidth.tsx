import { CSSProperties, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cellStyle, computeWidths } from '../helpers/width.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'

interface WidthSetterOptions {
  columnIndex: number;
  width?: number; // undefined to remove the width
}

interface ColumnWidthContextType {
  getColumnWidth?: (columnIndex: number) => number | undefined
  getColumnStyle?: (columnIndex: number) => CSSProperties
  setAvailableWidth?: (width: number | undefined) => void // used to set the width of the wrapper element
  setFixedColumnWidth?: (options: WidthSetterOptions) => void // used to set a fixed width for a column (will be stored and overrides the auto width)
  setMeasuredColumnWidth?: (options: WidthSetterOptions) => void // used to set the width of a column based on its measured width
}

export const ColumnWidthContext = createContext<ColumnWidthContextType>({})

interface ColumnWidthProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the widths array, and compute the widths)
  minWidth: number // minimum width for a column in pixels
  children: ReactNode
}

// in local storage, uninitialized values are stored as null, not as undefined
type StoredWidths = (number | undefined | null)[]

export function ColumnWidthProvider({ children, localStorageKey, numColumns, minWidth }: ColumnWidthProviderProps) {
  // An array of column widths
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [fixedWidths, setFixedWidths] = useLocalStorageState<StoredWidths>({ key: localStorageKey })
  const [measuredWidths, setMeasuredWidths] = useState<StoredWidths>([])
  const [availableWidth, setAvailableWidth] = useState<number | undefined>(undefined)

  const computedWidths = useMemo(() => {
    return computeWidths({ fixedWidths, measuredWidths, numColumns, minWidth, availableWidth })
  }, [fixedWidths, measuredWidths, numColumns, minWidth, availableWidth])

  const getColumnWidth = useCallback((columnIndex: number) => {
    const width = computedWidths[columnIndex]
    if (width === undefined) {
      return undefined
    }
    if (isNaN(width) || width < 0) {
      // TODO(SL): add a warning if the width seems too big?
      console.warn(`Invalid column width for column index ${columnIndex}: ${width}. Ignoring it.`)
      return undefined
    }
    return width
  }, [computedWidths])

  const getColumnStyle = useCallback((columnIndex: number) => {
    return cellStyle(getColumnWidth(columnIndex))
  }, [getColumnWidth])

  const setFixedColumnWidth = useCallback(({ columnIndex, width }: WidthSetterOptions) => {
    setFixedWidths(currentWidths => {
      const isInvalid = width !== undefined && (isNaN(width) || width < 0)
      const isUnchanged = currentWidths?.[columnIndex] === width
      if (isInvalid || isUnchanged) {
        return currentWidths
      }
      const next = [...currentWidths ?? []]
      if (width === undefined) {
        next[columnIndex] = undefined
      } else {
        // Note: if columnIndex is an invalid array index, it will be ignored
        next[columnIndex] = width
      }
      return next
    })
  }, [setFixedWidths])

  const setMeasuredColumnWidth = useCallback(({ columnIndex, width }: WidthSetterOptions) => {
    // Remove the fixed width, if any
    setFixedColumnWidth({ columnIndex, width: undefined })
    // Set the measure width
    setMeasuredWidths(currentWidths => {
      const isInvalid = width !== undefined && (isNaN(width) || width < 0)
      const isUnchanged = currentWidths[columnIndex] === width
      if (isInvalid || isUnchanged) {
        return currentWidths
      }
      const next = [...currentWidths]
      if (width === undefined) {
        next[columnIndex] = undefined
      } else {
        // Note: if columnIndex is an invalid array index, it will be ignored
        next[columnIndex] = width
      }
      return next
    })
  }, [setFixedColumnWidth, setMeasuredWidths])

  const value = useMemo(() => {
    return {
      getColumnWidth,
      getColumnStyle,
      setAvailableWidth,
      setFixedColumnWidth,
      setMeasuredColumnWidth,
    }
  }, [getColumnWidth, getColumnStyle, setAvailableWidth, setFixedColumnWidth, setMeasuredColumnWidth])

  return (
    <ColumnWidthContext.Provider value={value}>
      {children}
    </ColumnWidthContext.Provider>
  )
}

export function useColumnWidth() {
  return useContext(ColumnWidthContext)
}
