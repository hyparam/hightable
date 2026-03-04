import { type ReactNode, useMemo } from 'react'

import { type ColumnParameters, ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { useColumnDescriptors } from '../contexts/DataContext.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'columnConfiguration'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Provide the columns configuration to the table, through the ColumnParametersContext.
 *
 * It merges the column descriptors from the data frame with the user-provided configuration.
 */
export function ColumnParametersProvider({ columnConfiguration, children }: Props) {
  const columnDescriptors = useColumnDescriptors()
  const value = useMemo(() => {
    const inHeader = new Set(columnDescriptors.map(c => c.name))

    // Build descriptors following DataFrame columns order
    const cols: ColumnParameters[] = columnDescriptors.map(({ name, sortable }, i) => ({
      name,
      index: i,
      sortable: sortable ?? false, // Default to false if not specified
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
  }, [columnDescriptors, columnConfiguration])

  return (
    <ColumnParametersContext.Provider value={value}>
      {children}
    </ColumnParametersContext.Provider>
  )
}
