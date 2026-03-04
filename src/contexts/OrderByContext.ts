import { createContext, useContext } from 'react'

import type { OrderBy } from '../helpers/sort.js'

/** Order used to fetch and render the rows.
 *
 * If an empty array, the table is unordered.
 */
export const OrderByContext = createContext<OrderBy>([])

/**
 * Function to toggle the order of a column.
 *
 * It depends on the current order and the exclusiveSort mode (see DataContext)
 * and can be used to toggle between ascending, descending and no order for a column.
 *
 * @param columnName The name of the column to toggle
 */
export type ToggleColumnOrderBy = (columnName: string) => void

/**
 * Context to provide the function to toggle the order of a column.
 *
 * If undefined, the interactions are disabled.
 */
export const ToggleColumnOrderByContext = createContext<ToggleColumnOrderBy | undefined>(undefined)

export function useOrderBy() {
  return useContext(OrderByContext)
}

/**
 * Returns the order and index (0-based) of a column in the orderBy array.
 */
export function useColumnOrderBy(columnName: string) {
  const orderBy = useOrderBy()
  // no need to memoize, building a map is fast
  const orderByMap = new Map(orderBy.map(({ column, direction }, index) => [column, { direction, index }]))
  return {
    direction: orderByMap.get(columnName)?.direction,
    orderByIndex: orderByMap.get(columnName)?.index,
  }
}

export function useToggleColumnOrderBy() {
  return useContext(ToggleColumnOrderByContext)
}
