// src/hooks/useTableConfig.ts
import { useMemo } from 'react'
import { ColumnConfig, ColumnConfiguration } from '../helpers/columnConfiguration'
import { DataFrame } from '../helpers/dataframe'

export interface ColumnDescriptor extends ColumnConfig {
  key: string; // column name
  index: number; // position in current order
}

export function useTableConfig(
  df: DataFrame,
  config?: ColumnConfiguration
): ColumnDescriptor[] {
  return useMemo(() => {
    const { header, sortable: dfSortable } = df
    const inHeader = new Set(header)

    // Build descriptors following DataFrame.header order
    const cols: ColumnDescriptor[] = header.map((key, i) => ({
      key,
      index: i,
      sortable: dfSortable ?? false, // Set sortable to dataframe's value by default
      ...config?.[key] ?? {},
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
