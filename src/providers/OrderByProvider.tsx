import { type ReactNode, useMemo } from 'react'

import { useExclusiveSort } from '../contexts/DataContext.js'
import { OrderByContext, ToggleColumnOrderByContext } from '../contexts/OrderByContext.js'
import { type OrderBy, toggleColumn, toggleColumnExclusive } from '../helpers/sort.js'
import { useInputState } from '../hooks/useInputState.js'
import type { HighTableProps } from '../types.js'

type Props = Pick<HighTableProps, 'orderBy' | 'onOrderByChange'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Handles sorting.
 *
 * Provides the current orderBy state and a function to toggle a column.
 */
export function OrderByProvider({ children, orderBy, onOrderByChange }: Props) {
  const exclusiveSort = useExclusiveSort()
  const [state, setState] = useInputState<OrderBy>({
    controlledValue: orderBy,
    onChange: onOrderByChange,
    initialUncontrolledValue: [],
  })

  const toggleColumnOrderBy = useMemo(() => {
    if (!setState) {
      return undefined
    }
    if (exclusiveSort) {
      return (columnName: string) => {
        setState(toggleColumnExclusive(columnName, state))
      }
    } else {
      return (columnName: string) => {
        setState(toggleColumn(columnName, state))
      }
    }
  }, [exclusiveSort, state, setState])

  return (
    <ToggleColumnOrderByContext.Provider value={toggleColumnOrderBy}>
      <OrderByContext.Provider value={state}>
        {children}
      </OrderByContext.Provider>
    </ToggleColumnOrderByContext.Provider>
  )
}
