import { CSSProperties, ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react'
import { MaybeColumnWidth, adjustMeasuredWidths, cellStyle, hasFixedWidth, isValidWidth } from '../helpers/width.js'
import { useLocalStorageState } from './useLocalStorageState.js'

export type MaybeColumnState = MaybeColumnWidth

interface ColumnStatesContextType {
  getColumnWidth?: (columnIndex: number) => number | undefined
  getColumnStyle?: (columnIndex: number) => CSSProperties
  isFixedColumn?: (columnIndex: number) => boolean // returns true if the column has a fixed width
  setAvailableWidth?: (width: number) => void // used to set the width of the wrapper element
  forceWidth?: (options: { columnIndex: number; width: number }) => void // used to set a fixed width for a column (will be stored and overrides the auto width)
  measureWidth?: (options: { columnIndex: number; measured: number }) => void // used to set the measured width (and adjust all the measured columns)
  removeWidth?: (options: { columnIndex: number }) => void // used to remove the width of a column, so it can be measured again
}

export const ColumnStatesContext = createContext<ColumnStatesContextType>({})

interface ColumnStatesProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the widths array, and compute the widths)
  minWidth: number // minimum width for a column in pixels
  children: ReactNode
}

export function ColumnStatesProvider({ children, localStorageKey, numColumns, minWidth }: ColumnStatesProviderProps) {
  if (!isValidWidth(minWidth)) {
    throw new Error(`Invalid minWidth: ${minWidth}. It must be a positive number.`)
  }
  if (!Number.isInteger(numColumns) || numColumns < 0) {
    throw new Error(`Invalid numColumns: ${numColumns}. It must be a positive integer.`)
  }

  const [availableWidth, setAvailableWidth] = useState<number>(0)
  // ^ TODO: add a validation for availableWidth?

  const clamp = useCallback((width: number) => {
    return Math.floor(Math.max(width, minWidth))
  }, [minWidth])

  // An array of column states
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [columnStates, setColumnStates] = useLocalStorageState<MaybeColumnState[]>({ key: localStorageKey, parse, stringify })
  function stringify(columnStates: MaybeColumnState[]) {
    // only save the fixed widths
    const columnStatesWithoutMeasured = columnStates.map(columnState => {
      return hasFixedWidth(columnState) ? { width: columnState.width } : undefined
    })
    return JSON.stringify(columnStatesWithoutMeasured)
  }
  function parse(json: string): MaybeColumnState[] {
    const columnStates = JSON.parse(json)
    if (!Array.isArray(columnStates)) {
      return []
    }
    // only keep the width field, and ensure the width is clamped
    return columnStates.map((columnState: unknown) => {
      if (columnState === null || columnState === undefined) {
        return undefined
      }
      if (typeof columnState !== 'object' || !('width' in columnState)) {
        return undefined
      }
      const width = isValidWidth(columnState.width) ? clamp(columnState.width) : undefined
      return { width }
    })
  }

  const isValidIndex = useCallback((index: number) => {
    return Number.isInteger(index) && index >= 0 && index < numColumns
  }, [numColumns])

  const getColumnWidth = useCallback((columnIndex: number) => {
    return columnStates?.[columnIndex]?.width
  }, [columnStates])

  const getColumnStyle = useCallback((columnIndex: number) => {
    return cellStyle(getColumnWidth(columnIndex))
  }, [getColumnWidth])

  const isFixedColumn = useCallback((columnIndex: number) => {
    return hasFixedWidth(columnStates?.[columnIndex])
  }, [columnStates])

  const forceWidth = useCallback(({ columnIndex, width }: { columnIndex: number; width: number }) => {
    if (!isValidWidth(width) || !isValidIndex(columnIndex)) {
      return
    }
    setColumnStates(columnStates => {
      const nextColumnStates = [...columnStates ?? []]
      // clamp the width
      nextColumnStates[columnIndex] = { ...nextColumnStates[columnIndex] ?? {}, width: clamp(width), measured: undefined }
      // don't adjust other columns
      return nextColumnStates
    })
  }, [clamp, isValidIndex, setColumnStates])

  const measureWidth = useCallback(({ columnIndex, measured }: { columnIndex: number; measured: number }) => {
    if (!isValidWidth(measured) || !isValidIndex(columnIndex)) {
      return
    }
    // Set the measured width
    setColumnStates(columnStates => {
      // remove the computed width for all the columns with a 'measured' field
      const nextColumnStates = [...columnStates ?? []]
      nextColumnStates[columnIndex] = { ...nextColumnStates[columnIndex] ?? {}, measured: clamp(measured), width: undefined }
      // compute the adjusted widths
      return adjustMeasuredWidths({ columnWidths: nextColumnStates, availableWidth, minWidth, numColumns })
    })
  }, [availableWidth, clamp, isValidIndex, minWidth, numColumns, setColumnStates])

  const removeWidth = useCallback(({ columnIndex }: { columnIndex: number }) => {
    if (!isValidIndex(columnIndex)) {
      return
    }
    // Set the undefined width
    setColumnStates(columnStates => {
      const nextColumnStates = [...columnStates ?? []]
      nextColumnStates[columnIndex] = { ...nextColumnStates[columnIndex] ?? {}, measured: undefined, width: undefined }
      // don't compute anything
      return nextColumnStates
    })
  }, [isValidIndex, setColumnStates])

  const value = useMemo(() => {
    return {
      getColumnWidth,
      getColumnStyle,
      isFixedColumn,
      setAvailableWidth,
      forceWidth,
      measureWidth,
      removeWidth,
    }
  }, [getColumnWidth, getColumnStyle, isFixedColumn, setAvailableWidth, forceWidth, measureWidth, removeWidth])

  return (
    <ColumnStatesContext.Provider value={value}>
      {children}
    </ColumnStatesContext.Provider>
  )
}

export function useColumnStates() {
  return useContext(ColumnStatesContext)
}
