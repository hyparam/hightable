import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnsVisibilityContext } from '../contexts/ColumnsVisibilityContext.js'
import type { HighTableProps } from '../types.js'

type ColumnsVisibilityProviderProps = Pick<HighTableProps, 'onColumnsVisibilityChange'> & {
  /** Array of column names, in order */
  columnNames: string[]
  /** Initial columns visibility */
  initialColumnsVisibility?: ColumnsVisibility
  /** Children components */
  children: ReactNode
}

interface HiddenColumn {
  /** True if the column is hidden, default is false */
  hidden: true
}

/** Hidden column if defined and hidden field is true, shown otherwise */
type ColumnVisibility = HiddenColumn | undefined

/** Record of column visibility keyed by column name */
export type ColumnsVisibility = Record<string, ColumnVisibility>

/**
 * Provide the columns visibility to the table, i.e. which columns are hidden, plus actions to hide/show columns,
 * through the ColumnsVisibilityContext.
 */
export function ColumnsVisibilityProvider({ children, columnNames, initialColumnsVisibility, onColumnsVisibilityChange }: ColumnsVisibilityProviderProps) {
  const numColumns = columnNames.length

  // A record of column visibility keyed by column name
  const [columnsVisibility, setColumnsVisibility] = useState<ColumnsVisibility>(() => initialColumnsVisibility ?? {})

  const isHiddenColumn = useCallback((columnName: string) => {
    return columnsVisibility[columnName]?.hidden === true
  }, [columnsVisibility])

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
      setColumnsVisibility((current) => {
        const next = { ...current }
        next[columnName] = { hidden: true }
        onColumnsVisibilityChange?.(next)
        return next
      })
    }
  }, [canBeHidden, columnNames, setColumnsVisibility, onColumnsVisibilityChange])

  const showAllColumns = useMemo(() => {
    if (numberOfHiddenColumns === 0) {
      return undefined
    }
    return () => {
      const allVisible: Record<string, ColumnVisibility> = {}
      setColumnsVisibility(allVisible)
      onColumnsVisibilityChange?.(allVisible)
    }
  }, [numberOfHiddenColumns, setColumnsVisibility, onColumnsVisibilityChange])

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
    <ColumnsVisibilityContext.Provider value={value}>
      {children}
    </ColumnsVisibilityContext.Provider>
  )
}
