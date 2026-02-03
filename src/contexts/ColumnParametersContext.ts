import { createContext } from 'react'

import type { ColumnConfig } from '../helpers/columnConfiguration.js'
import type { ColumnDescriptor } from '../helpers/dataframe/index.js'

/**
 * Descriptors (name, sortable) and configuration (headerComponent, initiallyHidden, etc.) for a single column in the table.
 *
 * The column parameters don't include the `metadata` field from `ColumnDescriptor`
 */
export interface ColumnParameters extends ColumnConfig, Omit<ColumnDescriptor, 'metadata'> {
  /** Position of the column in the current order */
  index: number
}

/**
 * An array of column parameters, one per column, in the order they should be displayed.
 */
type ColumnParametersContextType = ColumnParameters[]

export const defaultColumnParametersContext: ColumnParametersContextType = []

export const ColumnParametersContext = createContext<ColumnParametersContextType>(defaultColumnParametersContext)
