import type { ReactNode } from 'react'
import { useCallback, useMemo } from 'react'

import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'

interface ColumnVisibilityStatesProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  columnNames: string[] // array of column names
  initialVisibilityStates?: Record<string, MaybeHiddenColumn> // initial visibility states for columns by name (used only if no local storage value exists)
  onColumnsVisibilityChange?: (columns: Record<string, MaybeHiddenColumn>) => void // callback which is called whenever the set of hidden columns changes.
  children: ReactNode
}

export interface HiddenColumn {
  hidden: true // true if the column is hidden, default is false
}
export type MaybeHiddenColumn = HiddenColumn | undefined

export function ColumnVisibilityStatesProvider({ children, localStorageKey, columnNames, initialVisibilityStates, onColumnsVisibilityChange }: ColumnVisibilityStatesProviderProps) {
  const numColumns = columnNames.length

  // A record of column visibility states keyed by column name
  const [columnVisibilityStates, setColumnVisibilityStates] = useLocalStorageState<Record<string, MaybeHiddenColumn>>({ key: localStorageKey, parse, stringify })
  function stringify(columnVisibilityStates: Record<string, MaybeHiddenColumn>) {
    return JSON.stringify(columnVisibilityStates)
  }
  function parse(json: string): Record<string, MaybeHiddenColumn> {
    const parsed = JSON.parse(json)
    if (typeof parsed !== 'object' || parsed === null) {
      return {}
    }
    const result: Record<string, MaybeHiddenColumn> = {}
    // only keep the hidden: true fields
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (value !== null && value !== undefined && typeof value === 'object' && 'hidden' in value && value.hidden === true) {
        result[key] = { hidden: true }
      }
    }
    return result
  }

  // Apply initial visibility states if no persisted state exists
  const effectiveColumnVisibilityStates = useMemo(
    () => columnVisibilityStates ?? initialVisibilityStates ?? {},
    [columnVisibilityStates, initialVisibilityStates]
  )

  const isHiddenColumn = useCallback((columnName: string) => {
    return effectiveColumnVisibilityStates[columnName]?.hidden === true
  }, [effectiveColumnVisibilityStates])

  const { numberOfHiddenColumns, numberOfVisibleColumns } = useMemo(() => {
    let numberOfHiddenColumns = 0
    for (const columnName of columnNames) {
      if (isHiddenColumn(columnName)) {
        numberOfHiddenColumns++
      }
    }
    return { numberOfHiddenColumns, numberOfVisibleColumns: numColumns - numberOfHiddenColumns }
  }, [columnNames, isHiddenColumn, numColumns])

  const canBeHidden = useCallback((columnName: string) => {
    return !isHiddenColumn(columnName) && numberOfVisibleColumns > 1
  }, [isHiddenColumn, numberOfVisibleColumns])

  const getHideColumn = useCallback((columnName: string) => {
    if (!columnNames.includes(columnName) || !canBeHidden(columnName)) {
      return undefined
    }
    return () => {
      setColumnVisibilityStates(currentStates => {
        const nextColumnVisibilityStates = { ...currentStates ?? initialVisibilityStates ?? {} }
        nextColumnVisibilityStates[columnName] = { hidden: true }
        onColumnsVisibilityChange?.(nextColumnVisibilityStates)
        return nextColumnVisibilityStates
      })
    }
  }, [canBeHidden, columnNames, setColumnVisibilityStates, onColumnsVisibilityChange, initialVisibilityStates])

  const showAllColumns = useMemo(() => {
    if (numberOfHiddenColumns === 0) {
      return undefined
    }
    return () => {
      const allVisible: Record<string, MaybeHiddenColumn> = {}
      setColumnVisibilityStates(allVisible)
      onColumnsVisibilityChange?.(allVisible)
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
