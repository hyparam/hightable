import { type ReactNode } from 'react'

import { OrderByContext, SetOrderByContext } from '../contexts/OrderByContext.js'
import type { OrderBy } from '../helpers/sort.js'
import { useInputState } from '../hooks/useInputState.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'orderBy' | 'onOrderByChange'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Handles sorting.
 *
 * Provides the current orderBy state and a callback to update it.
 */
export function OrderByProvider({ children, orderBy, onOrderByChange }: Props) {
  const [state, setState] = useInputState<OrderBy>({
    controlledValue: orderBy,
    onChange: onOrderByChange,
    initialUncontrolledValue: [],
  })

  return (
    <SetOrderByContext.Provider value={setState}>
      <OrderByContext.Provider value={state}>
        {children}
      </OrderByContext.Provider>
    </SetOrderByContext.Provider>
  )
}
