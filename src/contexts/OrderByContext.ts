import { createContext } from 'react'

import type { OrderBy } from '../helpers/sort.js'

interface OrderByContextType {
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
}

export const defaultOrderByContext: OrderByContextType = {}

export const OrderByContext = createContext<OrderByContextType>(defaultOrderByContext)
