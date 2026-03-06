import { type ReactNode, useContext, useMemo } from 'react'

import { type ColumnParameters, ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnNamesContext } from '../contexts/DataContext.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'columnConfiguration'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Provide the columns configuration to the table, through the ColumnParametersContext.
 *
 * It merges the column names with the user-provided configuration.
 */
export function ColumnParametersProvider({ columnConfiguration, children }: Props) {
  const columnNames = useContext(ColumnNamesContext)

  const columnParameters = useMemo(() => {
    const inHeader = new Set(columnNames)

    // Build column parameters following column names order
    const cols: ColumnParameters[] = columnNames.map((name, index) => ({
      name,
      index,
      ...columnConfiguration?.[name] ?? {},
    }))

    if (columnConfiguration) {
      for (const k of Object.keys(columnConfiguration)) {
        if (!inHeader.has(k)) {
          console.warn(
            `[HighTable] columnConfiguration has unknown key “${k}”. It will be ignored.`
          )
        }
      }
    }

    return cols
  }, [columnNames, columnConfiguration])

  return (
    <ColumnParametersContext.Provider value={columnParameters}>
      {children}
    </ColumnParametersContext.Provider>
  )
}
