import { ReactNode, createContext, useContext } from 'react'
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
  disabled?: boolean // if true, the order is not applied and the sort controls are hidden.
  children: ReactNode
}

export function OrderByProvider({ children, orderBy, onOrderByChange, disabled }: OrderByProviderProps) {
  const state = useInputState<OrderBy>({
    value: orderBy,
    onChange: onOrderByChange,
    defaultValue: [],
    disabled,
  })

  return (
    <OrderByContext.Provider value={{
      orderBy: undefined, //state.value, // TODO(SL): enable this when the DataFrame supports sorting
      onOrderByChange: state.onChange,
    }}>
      {children}
    </OrderByContext.Provider>
  )
}

export function useOrderBy() {
  return useContext(OrderByContext)
}
