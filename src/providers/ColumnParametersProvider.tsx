import { type ReactNode, useMemo } from 'react'

import { type ColumnParameters, ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnConfiguration } from '../helpers/columnConfiguration.js'
import { ColumnDescriptor } from '../helpers/dataframe/index.js'

interface ColumnParametersProviderProps {
  columnConfiguration?: ColumnConfiguration
  columnDescriptors: ColumnDescriptor[]
  children: ReactNode
}

export function ColumnParametersProvider({ columnConfiguration, columnDescriptors, children }: ColumnParametersProviderProps) {
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
