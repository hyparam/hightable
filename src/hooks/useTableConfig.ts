// src/hooks/useTableConfig.ts
import { useMemo } from 'react'
import { ColumnConfig, ColumnConfiguration } from '../helpers/columnConfiguration'

export interface ColumnDescriptor extends ColumnConfig {
  key: string; // column name
  index: number; // position in current order
}

export function useTableConfig(
  header: string[],
  config?: ColumnConfiguration
): ColumnDescriptor[] {
  return useMemo(() => {
    const inHeader = new Set(header)

    // Build descriptors following DataFrame.header order
    const cols: ColumnDescriptor[] = header.map((key, i) => ({
      key,
      index: i,
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
  }, [header, config])
}
