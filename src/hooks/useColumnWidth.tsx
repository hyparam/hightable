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
  children: ReactNode
}

// in local storage, uninitialized values are stored as null, not as undefined
type StoredWidths = (number | undefined | null)[]

export function ColumnWidthProvider({ children, localStorageKey }: ColumnWidthProviderProps) {
  // An array of column widths
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [widths, setWidths] = useLocalStorageState<StoredWidths>({ key: localStorageKey })
  const [, setAvailableWidth] = useState<number | undefined>(undefined)

  const getColumnWidth = useCallback((columnIndex: number) => {
    const width = widths?.[columnIndex]
    if (width === undefined || width === null) {
      return undefined
    }
    if (isNaN(width) || width < 0) {
      // TODO(SL): add a warning if the width seems too big?
      console.warn(`Invalid column width for column index ${columnIndex}: ${width}. Ignoring it.`)
      return undefined
    }
    return width
  }, [widths])

  const getColumnStyle = useCallback((columnIndex: number) => {
    return cellStyle(getColumnWidth(columnIndex))
  }, [getColumnWidth])

  const setColumnWidth = useCallback(({ columnIndex, width }: WidthSetterOptions) => {
    setWidths(widths => {
      if (width !== undefined && (isNaN(width) || width < 0)) {
        // TODO(SL): add a warning if the width seems too big?
        throw new Error(`Invalid column width: ${width}`)
      }
      if (widths?.[columnIndex] === width) {
        // no change (avoid useless re-renders)
        return widths
      }
      const next = [...widths ?? []]
      if (width === undefined) {
        next[columnIndex] = undefined
      } else {
        // Note: if columnIndex is an invalid array index, it will be ignored
        next[columnIndex] = width
      }
      return next
    })
  }, [setWidths])

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
