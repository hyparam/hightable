import { ReactNode, createContext, useCallback, useContext, useMemo } from 'react'
import { useLocalStorageState } from './useLocalStorageState.js'

interface ColumnVisibilityStatesContextType {
  getHideColumn?: (columnIndex: number) => undefined | (() => void) // returns a function to hide the column, or undefined if the column cannot be hidden
  showAllColumns?: () => void // returns a function to show all columns, or undefined if there are no hidden columns
  isHiddenColumn?: (columnIndex: number) => boolean // returns true if the column is hidden
}

export const ColumnVisibilityStatesContext = createContext<ColumnVisibilityStatesContextType>({})

interface ColumnVisibilityStatesProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the visibility states array)
  onColumnsVisibilityChange?: (columns: MaybeHiddenColumn[]) => void // callback which is called whenever the set of hidden columns changes.
  children: ReactNode
}

export interface HiddenColumn {
  hidden: true // true if the column is hidden, default is false
}
export type MaybeHiddenColumn = HiddenColumn | undefined

export function ColumnVisibilityStatesProvider({ children, localStorageKey, numColumns, onColumnsVisibilityChange }: ColumnVisibilityStatesProviderProps) {
  if (!Number.isInteger(numColumns) || numColumns < 0) {
    throw new Error(`Invalid numColumns: ${numColumns}. It must be a positive integer.`)
  }

  // An array of column visibility states
  // The index is the column rank in the header (0-based)
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [columnVisibilityStates, setColumnVisibilityStates] = useLocalStorageState<MaybeHiddenColumn[]>({ key: localStorageKey, parse, stringify })
  function stringify(columnVisibilityStates: MaybeHiddenColumn[]) {
    return JSON.stringify(columnVisibilityStates)
  }
  function parse(json: string): MaybeHiddenColumn[] {
    const columnVisibilityStates = JSON.parse(json)
    if (!Array.isArray(columnVisibilityStates)) {
      return []
    }
    // only keep the hidden: true fields
    return columnVisibilityStates.map((columnVisibility: unknown) => {
      if (columnVisibility === null || columnVisibility === undefined) {
        return undefined
      }
      if (typeof columnVisibility !== 'object' || !('hidden' in columnVisibility) || columnVisibility.hidden !== true) {
        return undefined
      }
      return { hidden: true }
    })
  }

  const isValidIndex = useCallback((index: number) => {
    return Number.isInteger(index) && index >= 0 && index < numColumns
  }, [numColumns])

  const isHiddenColumn = useCallback((columnIndex: number) => {
    return columnVisibilityStates?.[columnIndex]?.hidden === true
  }, [columnVisibilityStates])

  const { numberOfHiddenColumns, numberOfVisibleColumns } = useMemo(() => {
    let numberOfHiddenColumns = 0
    for (let i = 0; i < numColumns; i++) {
      if (isHiddenColumn(i)) {
        numberOfHiddenColumns++
      }
    }
    return { numberOfHiddenColumns, numberOfVisibleColumns: numColumns - numberOfHiddenColumns }
  }, [numColumns, isHiddenColumn])

  const canBeHidden = useCallback((columnIndex: number) => {
    return !isHiddenColumn(columnIndex) && numberOfVisibleColumns > 1
  }, [isHiddenColumn, numberOfVisibleColumns])

  const getHideColumn = useCallback((columnIndex: number ) => {
    if (!isValidIndex(columnIndex) || !canBeHidden(columnIndex)) {
      return undefined
    }
    return () => {
      setColumnVisibilityStates(columnVisibilityStates => {
        const nextColumnVisibilityStates = [...columnVisibilityStates ?? []]
        nextColumnVisibilityStates[columnIndex] = { hidden: true }
        onColumnsVisibilityChange?.(nextColumnVisibilityStates)
        return nextColumnVisibilityStates
      })
    }
  }, [canBeHidden, isValidIndex, setColumnVisibilityStates, onColumnsVisibilityChange])

  const showAllColumns = useMemo(() => {
    if (numberOfHiddenColumns === 0) {
      return undefined
    }
    return () => {
      setColumnVisibilityStates(undefined)
      onColumnsVisibilityChange?.([])
    }
  }, [numberOfHiddenColumns, setColumnVisibilityStates, onColumnsVisibilityChange])

  const value = useMemo(() => {
    return {
      getHideColumn, showAllColumns, isHiddenColumn,
    }
  }, [getHideColumn, showAllColumns, isHiddenColumn])

  return (
    <ColumnVisibilityStatesContext.Provider value={value}>
      {children}
    </ColumnVisibilityStatesContext.Provider>
  )
}

export function useColumnVisibilityStates() {
  return useContext(ColumnVisibilityStatesContext)
}
