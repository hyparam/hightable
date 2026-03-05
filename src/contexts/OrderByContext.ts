import { createContext } from 'react'

import type { Direction, OrderBy } from '../helpers/sort.js'

interface ColumnSortInfo {
  /**
   * Direction of the sorting for this column.
   */
  direction: Direction
  /**
   * Position of the column in the orderBy array. 0 means it's the first sorted column, 1 means it's the second sorted column, etc.
   */
  index: number
}

/**
 * A lookup table to get the sorting information for a column, including:
 * - if it's sorted: direction and position in the orderBy array (0 = first sorted column, 1 = second sorted column, etc.)
 * - a function to toggle the order of the column
 *
 * If a column is not sortable, it won't be included in the table.
 * If a column is sortable but not currently sorted, the orderBy property will be undefined, but the toggleOrderBy function will be defined (unless the sorting is read-only).
 * If a column is sortable and currently sorted, both properties will be defined.
 */
export type SortInfoAndActionsByColumn = Map<string, {
  /**
   * Sorting information for the column, including direction and position in the orderBy array. If undefined, the column is sortable but not currently sorted.
   */
  sortInfo?: ColumnSortInfo
  /**
   * Function to toggle the order of the column. If undefined, the column is read-only and cannot be sorted through the interface.
   */
  toggleOrderBy?: () => void
}>

export const OrderByContext = createContext<OrderBy>([])
export const SortInfoAndActionsByColumnContext = createContext<SortInfoAndActionsByColumn>(new Map())
