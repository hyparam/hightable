import { CSSProperties, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { cellStyle } from '../helpers/width.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'

interface WidthSetterOptions {
  columnIndex: number;
  width?: number; // undefined to remove the width
}

interface ColumnWidthContextType {
  getColumnWidth?: (columnIndex: number) => number | undefined
  getColumnStyle?: (columnIndex: number) => CSSProperties
  setColumnWidth?: (options: WidthSetterOptions) => void
  setAvailableWidth?: (width: number | undefined) => void // used to set the width of the wrapper element
}

export const ColumnWidthContext = createContext<ColumnWidthContextType>({})

interface ColumnWidthProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the widths array, and compute the widths)
  children: ReactNode
}

// in local storage, uninitialized values are stored as null, not as undefined
type StoredWidths = (number | undefined | null)[]

export function ColumnWidthProvider({ children, localStorageKey, numColumns }: ColumnWidthProviderProps) {
  // An array of column widths
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [storedWidths, setStoredWidths] = useLocalStorageState<StoredWidths>({ key: localStorageKey })
  const [availableWidth, setAvailableWidth] = useState<number | undefined>(undefined)

  const computedWidths = useMemo(() => {
    if (storedWidths && storedWidths.length === numColumns) {
      return storedWidths
    }
    if (availableWidth !== undefined && availableWidth > 0) {
      return Array<number>(numColumns).fill(Math.floor(availableWidth / numColumns))
    }
    return []
  }, [storedWidths, numColumns, availableWidth])

  const getColumnWidth = useCallback((columnIndex: number) => {
    const width = computedWidths?.[columnIndex]
    if (width === undefined || width === null) {
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

  const setColumnWidth = useCallback(({ columnIndex, width }: WidthSetterOptions) => {
    setStoredWidths(currentWidths => {
      if (width !== undefined && (isNaN(width) || width < 0)) {
        // TODO(SL): add a warning if the width seems too big?
        throw new Error(`Invalid column width: ${width}`)
      }
      if (currentWidths?.[columnIndex] === width) {
        // no change (avoid useless re-renders)
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
  }, [setStoredWidths])

  const value = useMemo(() => {
    return {
      getColumnWidth,
      getColumnStyle,
      setColumnWidth,
      setAvailableWidth,
    }
  }, [getColumnWidth, getColumnStyle, setColumnWidth, setAvailableWidth])

  return (
    <ColumnWidthContext.Provider value={value}>
      {children}
    </ColumnWidthContext.Provider>
  )
}

export function useColumnWidth() {
  return useContext(ColumnWidthContext)
}
