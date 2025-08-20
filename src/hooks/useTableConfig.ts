// src/hooks/useTableConfig.ts
import { useMemo } from 'react'
import { ColumnConfig, ColumnConfiguration } from '../helpers/columnConfiguration.js'
import { ColumnDescriptor, DataFrame } from '../helpers/dataframe/index.js'

export interface ColumnParameters extends ColumnConfig, ColumnDescriptor {
  index: number; // position in current order
}

export function useTableConfig(
  df: Pick<DataFrame, 'columnDescriptors'>,
  config?: ColumnConfiguration
): ColumnParameters[] {
  return useMemo(() => {
    const { columnDescriptors } = df
    const inHeader = new Set(columnDescriptors.map(c => c.name))

    // Build descriptors following DataFrame.header order
    const cols: ColumnParameters[] = columnDescriptors.map(({ name, sortable }, i) => ({
      name,
      index: i,
      sortable: sortable ?? false, // Default to false if not specified
      ...config?.[name] ?? {},
    }))

    if (config) {
      for (const k of Object.keys(config)) {
        if (!inHeader.has(k)) {
          console.warn(
            `[HighTable] columnConfiguration has unknown key “${k}”. It will be ignored.`
          )
        }
      }
    }

    return cols
  }, [df, config])
}
