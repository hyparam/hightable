// src/hooks/useTableConfig.ts
import { useMemo } from 'react'
import { ColumnConfig, ColumnConfiguration } from '../helpers/columnConfiguration.js'
import { DataFrame, DataFrameSimple } from '../helpers/dataframe/index.js'

export interface ColumnDescriptor extends ColumnConfig {
  key: string; // column name
  index: number; // position in current order
}

export function useTableConfig(
  df: DataFrame | DataFrameSimple,
  config?: ColumnConfiguration
): ColumnDescriptor[] {
  return useMemo(() => {
    const { header } = df
    const dfSortable = 'sortable' in df ? df.sortable : false
    const inHeader = new Set(header)

    // Until dataframe 2.0 only allow disabling sort via UI, cannot directly enable sort
    if (config?.sortable) {
      console.warn('Currently enabling sort via sortable is not implemented, value will be ignored')
      delete config.sortable
    }
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
