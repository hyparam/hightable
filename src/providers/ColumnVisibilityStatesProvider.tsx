import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../contexts/ColumnVisibilityStatesContext.js'
import type { ColumnsVisibility, HighTableProps } from '../types.js'

type ColumnVisibilityStatesProviderProps = Pick<HighTableProps, 'onColumnsVisibilityChange'> & {
  /** Array of column names, in order */
  columnNames: string[]
  /** Initial visibility states for columns by name */
  initialVisibilityStates?: ColumnsVisibility
  /** Children components */
  children: ReactNode
}

export interface HiddenColumn {
  /** True if the column is hidden, default is false */
  hidden: true
}

/** Hidden column if defined and hidden field is true, shown otherwise */
export type MaybeHiddenColumn = HiddenColumn | undefined

/**
 * Provide the column visibility states to the table, i.e. which columns are hidden, plus actions to hide/show columns,
 * through the ColumnVisibilityStatesContext.
 */
export function ColumnVisibilityStatesProvider({ children, columnNames, initialVisibilityStates, onColumnsVisibilityChange }: ColumnVisibilityStatesProviderProps) {
  const numColumns = columnNames.length

  // A record of column visibility states keyed by column name
  const [columnVisibilityStates, setColumnVisibilityStates] = useState<ColumnsVisibility>(() => initialVisibilityStates ?? {})

  const isHiddenColumn = useCallback((columnName: string) => {
    return columnVisibilityStates[columnName]?.hidden === true
  }, [columnVisibilityStates])

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
      setColumnVisibilityStates((currentStates) => {
        const nextColumnVisibilityStates = { ...currentStates }
        nextColumnVisibilityStates[columnName] = { hidden: true }
        onColumnsVisibilityChange?.(nextColumnVisibilityStates)
        return nextColumnVisibilityStates
      })
    }
  }, [canBeHidden, columnNames, setColumnVisibilityStates, onColumnsVisibilityChange])

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

  const allColumnsParameters = useContext(ColumnParametersContext)
  const visibleColumnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const value = useMemo(() => {
    return {
      getHideColumn, showAllColumns, isHiddenColumn, numberOfVisibleColumns, visibleColumnsParameters,
    }
  }, [getHideColumn, showAllColumns, isHiddenColumn, numberOfVisibleColumns, visibleColumnsParameters])

  return (
    <ColumnVisibilityStatesContext.Provider value={value}>
      {children}
    </ColumnVisibilityStatesContext.Provider>
  )
}
