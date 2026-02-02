import { type ReactNode, useContext, useMemo } from 'react'

import { type ColumnParameters, ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ErrorContext } from '../contexts/ErrorContext.js'
import type { ColumnDescriptor } from '../helpers/dataframe/index.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'columnConfiguration'> & {
  /** Descriptors of the columns to display */
  columnDescriptors: ColumnDescriptor[]
  /** Child components */
  children: ReactNode
}

/**
 * Provide the columns configuration to the table, through the ColumnParametersContext.
 */
export function ColumnParametersProvider({ columnConfiguration, columnDescriptors, children }: Props) {
  const { onWarn } = useContext(ErrorContext)
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
          onWarn(
            `[HighTable] columnConfiguration has unknown key “${k}”. It will be ignored.`
          )
        }
      }
    }

    return cols
  }, [columnDescriptors, columnConfiguration, onWarn])

  return (
    <ColumnParametersContext.Provider value={value}>
      {children}
    </ColumnParametersContext.Provider>
  )
}
