import { ColumnConfig, ColumnConfiguration } from '../helpers/columnConfiguration.js'
import { ColumnDescriptor, DataFrame } from '../helpers/dataframe/index.js'
import { type ReactNode, createContext, useContext, useMemo } from 'react'

// The column parameters don't include the `metadata` field from `ColumnDescriptor`
export interface ColumnParameters extends ColumnConfig, Omit<ColumnDescriptor, 'metadata'> {
  index: number; // position in current order
}

export const ColumnParametersContext = createContext<ColumnParameters[]>([])

interface ColumnParametersProviderProps {
  columnConfiguration?: ColumnConfiguration
  data: Pick<DataFrame, 'columnDescriptors'>
  children: ReactNode
}

export function ColumnParametersProvider({ columnConfiguration, data, children }: ColumnParametersProviderProps) {
  const value = useMemo(() => {
    const { columnDescriptors } = data
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
  }, [data, columnConfiguration])

  return (
    <ColumnParametersContext.Provider value={value}>
      {children}
    </ColumnParametersContext.Provider>
  )
}

export function useColumnParameters(): ColumnParameters[] {
  return useContext(ColumnParametersContext)
}

export function useColumnMinWidths(): (number | undefined)[] {
  const columnParameters = useColumnParameters()
  const minWidths = useMemo(() => {
    return columnParameters.map(col => col.minWidth)
  }, [columnParameters])
  return minWidths
}
