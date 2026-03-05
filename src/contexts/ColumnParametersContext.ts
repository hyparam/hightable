import { createContext } from 'react'

import type { ColumnConfig } from '../helpers/columnConfiguration.js'
import type { ColumnDescriptor } from '../helpers/dataframe/index.js'

/**
 * Descriptors (name, sortable) and configuration (headerComponent, initiallyHidden, etc.) for a single column in the table.
 *
 * The column parameters don't include the `metadata` field from `ColumnDescriptor`
 */
export interface ColumnParameters extends ColumnConfig, Pick<ColumnDescriptor, 'name'> {
  /** Position of the column in the current order */
  index: number
}

/**
 * An array of column parameters, one per column, in the order they should be displayed.
 */
type ColumnParametersContextType = ColumnParameters[]
export const ColumnParametersContext = createContext<ColumnParametersContextType>([])

/**
 * A set of the names of the sortable columns. Used to check if a column is sortable, and to provide the toggle function in the OrderByContext.
 */
type SortableColumnsContextType = Set<string>
export const SortableColumnsContext = createContext<SortableColumnsContextType>(new Set())
