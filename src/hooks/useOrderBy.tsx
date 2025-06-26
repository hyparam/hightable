import { ReactNode, createContext, useContext, useState } from 'react'
import type { OrderBy } from '../helpers/sort.js'
import { useInputState } from './useInputState.js'

interface OrderByContextType {
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  ranksByColumn?: Map<string, number[]> // map of column names to ranks. Used to cache the ranks for each column to avoid recomputing them on every render.
  indexesByOrderBy?: Map<string, number[]> // map of orderBy to indexes. Used to cache the indexes for each orderBy to avoid recomputing them on every render.
}

export const OrderByContext = createContext<OrderByContextType>({})

interface OrderByProviderProps {
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  disabled?: boolean // if true, the order is not applied and the sort controls are hidden.
  children: ReactNode
}

export function OrderByProvider({ children, orderBy, onOrderByChange, disabled }: OrderByProviderProps) {
  // TODO(SL): remove this state and only rely on the data frame for these operations?
  // ie. cache the previous sort indexes in the data frame itself
  const [ranksByColumn] = useState<Map<string, number[]>>(() => new Map())
  const [indexesByOrderBy] = useState<Map<string, number[]>>(() => new Map())

  const state = useInputState<OrderBy>({
    value: orderBy,
    onChange: onOrderByChange,
    defaultValue: [],
    disabled,
  })

  return (
    <OrderByContext.Provider value={{
      orderBy: state.value,
      onOrderByChange: state.onChange,
      ranksByColumn,
      indexesByOrderBy,
    }}>
      {children}
    </OrderByContext.Provider>
  )
}

export function useOrderBy() {
  return useContext(OrderByContext)
}
