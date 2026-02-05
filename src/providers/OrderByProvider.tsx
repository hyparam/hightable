import { type ReactNode, useMemo } from 'react'

import { OrderByContext } from '../contexts/OrderByContext.js'
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

  const value = useMemo(() => ({
    orderBy: state,
    setOrderBy: setState,
  }), [state, setState])

  return (
    <OrderByContext.Provider value={value}>
      {children}
    </OrderByContext.Provider>
  )
}
