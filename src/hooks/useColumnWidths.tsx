import { CSSProperties, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MaybeColumnWidth, adjustMeasuredWidths, cellStyle, hasFixedWidth, isValidWidth } from '../helpers/width.js'
import { useLocalStorageState } from './useLocalStorageState.js'

interface ColumnWidthsContextType {
  getColumnWidth?: (columnIndex: number) => number | undefined
  getColumnStyle?: (columnIndex: number) => CSSProperties
  isFixedColumn?: (columnIndex: number) => boolean // returns true if the column has a fixed width
  setAvailableWidthAndAdjustMeasured?: (width: number) => void // used to set the width of the wrapper element, and update the measured columns
  forceWidth?: (options: { columnIndex: number; width: number, minWidth?: number }) => void // used to set a fixed width for a column (will be stored and overrides the auto width)
  measureWidth?: (options: { columnIndex: number; measured: number }) => void // used to set the measured width (and adjust all the measured columns)
  removeWidth?: (options: { columnIndex: number }) => void // used to remove the width of a column, so it can be measured again
}

export const ColumnWidthsContext = createContext<ColumnWidthsContextType>({})

interface ColumnWidthsProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the widths array, and compute the widths)
  minWidth: number // minimum width for a column in pixels
  children: ReactNode
}

export function ColumnWidthsProvider({ children, localStorageKey, numColumns, minWidth }: ColumnWidthsProviderProps) {
  if (!isValidWidth(minWidth)) {
    throw new Error(`Invalid minWidth: ${minWidth}. It must be a positive number.`)
  }
  if (!Number.isInteger(numColumns) || numColumns < 0) {
    throw new Error(`Invalid numColumns: ${numColumns}. It must be a positive integer.`)
  }

  const [availableWidth, setAvailableWidth] = useState<number>(0)

  const clampMin = useCallback((width: number, configMinWidth?: number) => {
    const minWidthToUse = configMinWidth ?? minWidth
    return Math.floor(Math.max(width, minWidthToUse))
  }, [minWidth])

  // An array of column widths
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [columnWidths, setColumnWidths] = useLocalStorageState<MaybeColumnWidth[]>({ key: localStorageKey, parse, stringify })
  function stringify(columnWidths: MaybeColumnWidth[]) {
    // only save the fixed widths
    const columnWidthsWithoutMeasured = columnWidths.map(columnWidth => {
      return hasFixedWidth(columnWidth) ? { width: columnWidth.width } : undefined
    })
    return JSON.stringify(columnWidthsWithoutMeasured)
  }
  function parse(json: string): MaybeColumnWidth[] {
    const columnWidths = JSON.parse(json)
    if (!Array.isArray(columnWidths)) {
      return []
    }
    // only keep the width field, and ensure the width is clamped above the min
    return columnWidths.map((columnWidth: unknown) => {
      if (columnWidth === null || columnWidth === undefined) {
        return undefined
      }
      if (typeof columnWidth !== 'object' || !('width' in columnWidth)) {
        return undefined
      }
      const width = isValidWidth(columnWidth.width) ? clampMin(columnWidth.width) : undefined
      return { width }
    })
  }

  const isValidIndex = useCallback((index: number) => {
    return Number.isInteger(index) && index >= 0 && index < numColumns
  }, [numColumns])

  const getColumnWidth = useCallback((columnIndex: number) => {
    return columnWidths?.[columnIndex]?.width
  }, [columnWidths])

  const getColumnStyle = useCallback((columnIndex: number) => {
    return cellStyle(getColumnWidth(columnIndex))
  }, [getColumnWidth])

  const isFixedColumn = useCallback((columnIndex: number) => {
    return hasFixedWidth(columnWidths?.[columnIndex])
  }, [columnWidths])

  const forceWidth = useCallback(({ columnIndex, width, minWidth }: { columnIndex: number; width: number; minWidth?: number }) => {
    if (!isValidWidth(width) || !isValidIndex(columnIndex)) {
      return
    }
    setColumnWidths(columnWidths => {
      const nextColumnWidths = [...columnWidths ?? []]
      // clamp the width above the min
      nextColumnWidths[columnIndex] = { ...nextColumnWidths[columnIndex] ?? {}, width: clampMin(width, minWidth), measured: undefined }
      // don't adjust other columns
      return nextColumnWidths
    })
  }, [clampMin, isValidIndex, setColumnWidths])

  const measureWidth = useCallback(({ columnIndex, measured }: { columnIndex: number; measured: number }) => {
    if (!isValidWidth(measured) || !isValidIndex(columnIndex)) {
      return
    }
    // Set the measured width
    setColumnWidths(columnWidths => {
      // remove the computed width for all the columns with a 'measured' field
      const nextColumnWidths = [...columnWidths ?? []]
      nextColumnWidths[columnIndex] = { ...nextColumnWidths[columnIndex] ?? {}, measured: clampMin(measured), width: undefined }
      // compute the adjusted widths
      return adjustMeasuredWidths({ columnWidths: nextColumnWidths, availableWidth, clampMin, numColumns })
    })
  }, [availableWidth, clampMin, isValidIndex, numColumns, setColumnWidths])

  const removeWidth = useCallback(({ columnIndex }: { columnIndex: number }) => {
    if (!isValidIndex(columnIndex)) {
      return
    }
    // Set the undefined width
    setColumnWidths(columnWidths => {
      const nextColumnWidths = [...columnWidths ?? []]
      nextColumnWidths[columnIndex] = { ...nextColumnWidths[columnIndex] ?? {}, measured: undefined, width: undefined }
      // don't compute anything
      return nextColumnWidths
    })
  }, [isValidIndex, setColumnWidths])

  const setAvailableWidthAndAdjustMeasured = useCallback((nextAvailableWidth: number) => {
    if (!isValidWidth(nextAvailableWidth)) {
      return
    }
    setAvailableWidth(nextAvailableWidth)
    setColumnWidths(columnWidths => {
      // compute the adjusted widths
      return adjustMeasuredWidths({ columnWidths: columnWidths ?? [], availableWidth: nextAvailableWidth, clampMin, numColumns })
    })
  }, [clampMin, numColumns, setColumnWidths])

  const value = useMemo(() => {
    return {
      getColumnWidth,
      getColumnStyle,
      isFixedColumn,
      setAvailableWidthAndAdjustMeasured,
      forceWidth,
      measureWidth,
      removeWidth,
    }
  }, [getColumnWidth, getColumnStyle, isFixedColumn, setAvailableWidthAndAdjustMeasured, forceWidth, measureWidth, removeWidth])

  return (
    <ColumnWidthsContext.Provider value={value}>
      {children}
    </ColumnWidthsContext.Provider>
  )
}

export function useColumnWidths() {
  return useContext(ColumnWidthsContext)
}
