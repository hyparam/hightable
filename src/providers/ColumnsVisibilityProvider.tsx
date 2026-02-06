import type { ReactNode } from 'react'
import { useCallback, useContext, useMemo } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnsVisibilityContext } from '../contexts/ColumnsVisibilityContext.js'
import { useInputState } from '../hooks/useInputState.js'
import type { HighTableProps } from '../types.js'

type ColumnsVisibilityProviderProps = Pick<HighTableProps, 'columnsVisibility' | 'onColumnsVisibilityChange'> & {
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
export function ColumnsVisibilityProvider({ children, columnsVisibility: controlledColumnsVisibility, onColumnsVisibilityChange }: ColumnsVisibilityProviderProps) {
  const allColumnsParameters = useContext(ColumnParametersContext)
  const columnNames = useMemo(() => new Set(allColumnsParameters.map(c => c.name)), [allColumnsParameters])
  const initialColumnsVisibility = useMemo(() => {
    return Object.fromEntries(
      allColumnsParameters
        .filter(({ initiallyHidden }) => initiallyHidden)
        .map(({ name }) => [name, { hidden: true as const }])
    )
  }, [allColumnsParameters])

  // A record of column visibility keyed by column name
  const [columnsVisibility, setColumnsVisibility] = useInputState<ColumnsVisibility>({
    controlledValue: controlledColumnsVisibility,
    initialUncontrolledValue: initialColumnsVisibility,
    onChange: onColumnsVisibilityChange,
  })
  const areInteractionsDisabled = setColumnsVisibility === undefined

  const isHiddenColumn = useCallback((columnName: string) => {
    return columnsVisibility[columnName]?.hidden === true
  }, [columnsVisibility])

  const { numberOfHiddenColumns, numberOfVisibleColumns } = useMemo(() => {
    let numberOfHiddenColumns = 0
    for (const name of columnNames) {
      if (isHiddenColumn(name)) {
        numberOfHiddenColumns++
      }
    }
    return { numberOfHiddenColumns, numberOfVisibleColumns: columnNames.size - numberOfHiddenColumns }
  }, [columnNames, isHiddenColumn])

  const canBeHidden = useCallback((columnName: string) => {
    return columnNames.has(columnName) && !isHiddenColumn(columnName) && numberOfVisibleColumns > 1
  }, [columnNames, isHiddenColumn, numberOfVisibleColumns])

  const getHideColumn = useCallback((columnName: string) => {
    if (!canBeHidden(columnName) || areInteractionsDisabled) {
      return undefined
    }
    return () => {
      setColumnsVisibility({ ...columnsVisibility, [columnName]: { hidden: true as const } })
    }
  }, [canBeHidden, setColumnsVisibility, columnsVisibility, areInteractionsDisabled])

  const showAllColumns = useMemo(() => {
    if (numberOfHiddenColumns === 0 || areInteractionsDisabled) {
      return undefined
    }
    return () => {
      const allVisible: Record<string, ColumnVisibility> = {}
      setColumnsVisibility(allVisible)
    }
  }, [numberOfHiddenColumns, setColumnsVisibility, areInteractionsDisabled])

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
