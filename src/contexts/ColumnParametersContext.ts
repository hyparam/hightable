import { createContext } from 'react'

import { ColumnConfig } from '../helpers/columnConfiguration.js'
import { ColumnDescriptor } from '../helpers/dataframe/index.js'

// The column parameters don't include the `metadata` field from `ColumnDescriptor`
export interface ColumnParameters extends ColumnConfig, Omit<ColumnDescriptor, 'metadata'> {
  index: number; // position in current order
}

export const defaultColumnParametersContext: ColumnParameters[] = []

export const ColumnParametersContext = createContext<ColumnParameters[]>(defaultColumnParametersContext)
