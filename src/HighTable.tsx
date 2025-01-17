import { useCallback, useState } from 'react'
import ControlledHighTable, { TableProps } from './ControlledHighTable.js'
import { SelectionAndAnchor } from './selection.js'
import { OrderBy } from './sort.js'
export { stringify, TableProps, throttle } from './ControlledHighTable.js'
export {
  arrayDataFrame, AsyncRow, asyncRows,
  awaitRow,
  awaitRows, DataFrame,
  ResolvablePromise, resolvablePromise,
  resolvableRow, Row, sortableDataFrame,
  wrapPromise,
} from './dataframe.js'
export { rowCache } from './rowCache.js'
export { SelectionAndAnchor } from './selection.js'
export { OrderBy } from './sort.js'
export { ControlledHighTable, HighTable }

/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * orderBy: the column to order by. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state). If the data cannot be sorted, it's ignored.
 * onOrderByChange: the callback to call when the order changes. If undefined, the component order is read-only if controlled (orderBy is set), or disabled if not (or if the data cannot be sorted).
 * selection: the selected rows and the anchor row. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state).
 * onSelectionChange: the callback to call when the selection changes. If undefined, the component selection is read-only if controlled (selection is set), or disabled if not.
 */
export default function HighTable({
  data,
  cacheKey,
  overscan = 20,
  padding = 20,
  focus = true,
  orderBy: propOrderBy,
  onOrderByChange,
  selectionAndAnchor: propSelection,
  onSelectionAndAnchorChange,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: TableProps) {
  /**
   * Four modes:
   * - controlled (orderBy and onOrderByChange are defined): the parent controls the sort and receives the user interactions. No local state.
   * - controlled read-only (orderBy is defined, onOrderByChange is undefined): the parent controls the sort and the user interactions are disabled. No local state.
   * - uncontrolled (orderBy is undefined, onOrderByChange is defined): the component controls the sort and the user interactions. Local state.
   * - disabled (data is not sortable, or orderBy and onOrderByChange are undefined): the sort is hidden and the user interactions are disabled. No local state.
   */
  const [initialOrderBy] = useState<OrderBy | undefined>(propOrderBy)
  const [localOrderBy, setLocalOrderBy] = useState<OrderBy | undefined>({})
  const isOrderByControlled = initialOrderBy !== undefined
  const showOrderByInteractions = onOrderByChange !== undefined
  let orderBy: OrderBy | undefined
  if (!data.sortable) {
    console.log('The component sort is disabled because the data is not sortable.')
    orderBy = undefined
  } else if (isOrderByControlled) {
    if (propOrderBy === undefined) {
      console.warn('The component sort is controlled (is has no local state) because "orderBy" was initially defined. "orderBy" cannot be set to undefined now (it is set back to the initial value).')
      orderBy = initialOrderBy
    } else {
      orderBy = propOrderBy
    }
  } else {
    if (propOrderBy !== undefined) {
      console.warn('The component sort is uncontrolled (it only has a local state) because "orderBy" was initially undefined. "orderBy" cannot be set to a value now and is ignored.')
    }
    if (onOrderByChange === undefined) {
      console.warn('The component sort is disabled because "onOrderByChange" is undefined. If you want to enable sort, you must provide "onOrderByChange".')
      orderBy = undefined
    } else {
      orderBy = localOrderBy
    }
  }
  const getOnOrderByChange = useCallback(() => {
    if (!showOrderByInteractions || !data.sortable) {
      return undefined
    }
    return (orderBy: OrderBy) => {
      onOrderByChange?.(orderBy)
      if (!isOrderByControlled) {
        setLocalOrderBy(orderBy)
      }
    }
  }, [onOrderByChange, isOrderByControlled, showOrderByInteractions, data.sortable])

  /**
   * Four modes:
   * - controlled (selection and onSelectionAndAnchorChange are defined): the parent controls the selection and receives the user interactions. No local state.
   * - controlled read-only (selection is defined, onSelectionAndAnchorChange is undefined): the parent controls the selection and the user interactions are disabled. No local state.
   * - uncontrolled (selection is undefined, onSelectionAndAnchorChange is defined): the component controls the selection and the user interactions. Local state.
   * - disabled (selection and onSelectionAndAnchorChange are undefined): the selection is hidden and the user interactions are disabled. No local state.
   */
  const [initialSelection] = useState<SelectionAndAnchor | undefined>(propSelection)
  const [localSelection, setLocalSelection] = useState<SelectionAndAnchor | undefined>({ selection: [], anchor: undefined })
  const isSelectionControlled = initialSelection !== undefined
  const showSelectionInteractions = onSelectionAndAnchorChange !== undefined
  let selectionAndAnchor: SelectionAndAnchor | undefined
  if (isSelectionControlled) {
    if (propSelection === undefined) {
      console.warn('The component selection is controlled (is has no local state) because "selection" was initially defined. "selection" cannot be set to undefined now (it is set back to the initial value).')
      selectionAndAnchor = initialSelection
    } else {
      selectionAndAnchor = propSelection
    }
  } else {
    if (propSelection !== undefined) {
      console.warn('The component selection is uncontrolled (it only has a local state) because "selection" was initially undefined. "selection" cannot be set to a value now and is ignored.')
    }
    if (onSelectionAndAnchorChange === undefined) {
      console.warn('The component selection is disabled because "onSelectionAndAnchorChange" is undefined. If you want to enable selection, you must provide "onSelectionAndAnchorChange".')
      selectionAndAnchor = undefined
    } else {
      selectionAndAnchor = localSelection
    }
  }
  const getOnSelectionAndAnchorChange = useCallback(() => {
    if (!showSelectionInteractions) {
      return undefined
    }
    return (selectionAndAnchor: SelectionAndAnchor) => {
      onSelectionAndAnchorChange?.(selectionAndAnchor)
      if (!isSelectionControlled) {
        setLocalSelection(selectionAndAnchor)
      }
    }
  }, [onSelectionAndAnchorChange, isSelectionControlled, showSelectionInteractions])

  return <ControlledHighTable
    data={data}
    cacheKey={cacheKey}
    overscan={overscan}
    padding={padding}
    focus={focus}
    orderBy={orderBy}
    onOrderByChange={getOnOrderByChange()}
    selectionAndAnchor={selectionAndAnchor}
    onSelectionAndAnchorChange={getOnSelectionAndAnchorChange()}
    onDoubleClickCell={onDoubleClickCell}
    onMouseDownCell={onMouseDownCell}
    onError={onError}
  ></ControlledHighTable>
}
