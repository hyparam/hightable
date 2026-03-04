import { createContext, useContext } from 'react'

import type { OrderBy } from '../helpers/sort.js'

/** Order used to fetch and render the rows.
 *
 * If undefined, or an empty array, the table is unordered.
 *
 * If undefined, the sort controls are hidden and the interactions are disabled.
 */
export const OrderByContext = createContext<OrderBy | undefined>(undefined)

/**
 * Function to set the order.
 *
 * The interactions are disabled if undefined.
 *
 * @param orderBy The new orderBy value
 */
export const SetOrderByContext = createContext<((orderBy: OrderBy) => void) | undefined>(undefined)

export function useOrderBy() {
  return useContext(OrderByContext)
}

export function useSetOrderBy() {
  return useContext(SetOrderByContext)
}
