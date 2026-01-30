import { createContext } from 'react'

import type { ColumnConfig } from '../helpers/columnConfiguration.js'
import type { ColumnDescriptor } from '../helpers/dataframe/index.js'

/**
 * The column parameters don't include the `metadata` field from `ColumnDescriptor`
 */
export interface ColumnParameters extends ColumnConfig, Omit<ColumnDescriptor, 'metadata'> {
  /** Position of the column in the current order */
  index: number
}

/**
 * The context type is an array of column parameters, one per column, in the order they should be displayed.
 */
type ColumnParametersContextType = ColumnParameters[]

export const defaultColumnParametersContext: ColumnParametersContextType = []

export const ColumnParametersContext = createContext<ColumnParametersContextType>(defaultColumnParametersContext)
