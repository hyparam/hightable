import { type ReactNode, useContext, useMemo } from 'react'

import { SortableColumnsContext } from '../contexts/ColumnParametersContext.js'
import { useExclusiveSort } from '../contexts/DataContext.js'
import { OrderByContext, SortInfoAndActionsByColumnContext } from '../contexts/OrderByContext.js'
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
 * Provides the global orderBy state, and a lookup table to get the state and toggle function for each column.
 *
 * The toggle function depends on the exclusiveSort mode (see DataContext):
 * - if exclusiveSort is true, toggling a column will set it as the only sorted column, or remove it from the orderBy if it's already the only one sorted.
 * - if exclusiveSort is false, toggling a column will add it to the orderBy (as the first sorted column), change its direction, or remove it from the orderBy, depending on its current state in the orderBy.
 *
 * The context value is memoized and won't change unless the orderBy or the sortable columns change, to avoid unnecessary re-renders of the consumers.
 */
export function OrderByProvider({ children, orderBy: controlledOrderBy, onOrderByChange }: Props) {
  const exclusiveSort = useExclusiveSort()
  const sortableColumns = useContext(SortableColumnsContext)

  const [orderBy, setOrderBy] = useInputState<OrderBy>({
    controlledValue: controlledOrderBy,
    onChange: onOrderByChange,
    initialUncontrolledValue: [],
  })

  // Check that all columns in state are sortable, and warn if not.
  // The unsortable columns are not included in the context orderBy, so they are not sorted nor shown as ordered.
  const filteredOrderBy = useMemo(() => {
    // ^ memoizing this check to avoid logging warnings on every render, and only when orderBy or columnParameters change.
    return orderBy.filter(({ column }) => {
      if (!sortableColumns.has(column)) {
        console.warn(`Column "${column}" is in orderBy but is not sortable. It will be ignored. Fix the orderBy state or set the column as sortable.`)
        return false
      }
      return true
    })
  }, [orderBy, sortableColumns])

  const toggleColumnOrderBy = useMemo(() => {
    if (!setOrderBy) {
      return undefined
    }
    if (exclusiveSort) {
      return (columnName: string) => {
        setOrderBy(toggleColumnExclusive(columnName, filteredOrderBy))
      }
    } else {
      return (columnName: string) => {
        setOrderBy(toggleColumn(columnName, filteredOrderBy))
      }
    }
  }, [exclusiveSort, filteredOrderBy, setOrderBy])

  const sortInfoAndActionsByColumn = useMemo(() => {
    const sortInfoByColumn = new Map(
      filteredOrderBy.map(({ column, direction }, index) => {
        return [column, { direction, index }]
      })
    )
    return new Map(
      [...sortableColumns].map((column) => {
        return [column, {
          sortInfo: sortInfoByColumn.get(column),
          toggleOrderBy: toggleColumnOrderBy ? () => { toggleColumnOrderBy(column) } : undefined,
        }]
      })
    )
  }, [sortableColumns, filteredOrderBy, toggleColumnOrderBy])

  return (
    <OrderByContext.Provider value={filteredOrderBy}>
      <SortInfoAndActionsByColumnContext.Provider value={sortInfoAndActionsByColumn}>
        {children}
      </SortInfoAndActionsByColumnContext.Provider>
    </OrderByContext.Provider>
  )
}
