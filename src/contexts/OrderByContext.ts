import { createContext } from 'react'

import type { OrderBy } from '../helpers/sort.js'

interface OrderByContextType {
  /** Order used to fetch and render the rows.
   *
   * If undefined, or an empty array, the table is unordered.
   *
   * If undefined, the sort controls are hidden and the interactions are disabled.
   */
  orderBy?: OrderBy
  /**
   * Callback to call when a user interaction changes the order.
   *
   * The interactions are disabled if undefined.
   *
   * @param orderBy The new orderBy value
   */
  onOrderByChange?: (orderBy: OrderBy) => void
}

export const defaultOrderByContext: OrderByContextType = {}

export const OrderByContext = createContext<OrderByContextType>(defaultOrderByContext)
