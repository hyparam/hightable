import { createContext, ReactNode, useContext } from 'react'

import type { OrderBy } from '../helpers/sort.js'
import { useInputState } from './useInputState.js'

interface OrderByContextType {
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
}

export const OrderByContext = createContext<OrderByContextType>({})

interface OrderByProviderProps {
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  children: ReactNode
}

export function OrderByProvider({ children, orderBy, onOrderByChange }: OrderByProviderProps) {
  const state = useInputState<OrderBy>({
    value: orderBy,
    onChange: onOrderByChange,
    defaultValue: [],
  })

  return (
    <OrderByContext.Provider value={{
      orderBy: state.value,
      onOrderByChange: state.onChange,
    }}>
      {children}
    </OrderByContext.Provider>
  )
}

export function useOrderBy() {
  return useContext(OrderByContext)
}
