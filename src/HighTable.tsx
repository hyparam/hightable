import { useCallback, useReducer, useState } from 'react'
import type { InternalAction, InternalState, SelectionAndAnchor, TableProps } from './ControlledHighTable.js'
import ControlledHighTable from './ControlledHighTable.js'
import { OrderBy } from './sort.js'
export { stringify, throttle } from './ControlledHighTable.js'
export type { ControlledTableProps, InternalAction, InternalState, SelectionAndAnchor, TableProps } from './ControlledHighTable.js'
export {
  AsyncRow, DataFrame,
  ResolvablePromise, Row, arrayDataFrame, asyncRows,
  awaitRow,
  awaitRows, resolvablePromise,
  resolvableRow, sortableDataFrame,
  wrapPromise,
} from './dataframe.js'
export { rowCache } from './rowCache.js'
export type { Selection } from './selection.js'
export { OrderBy } from './sort.js'
export { ControlledHighTable, HighTable }

type State = InternalState & {
  orderBy?: OrderBy,
  selectionAndAnchor?: SelectionAndAnchor
}

type Action = InternalAction
| { type: 'SET_ORDER', orderBy: OrderBy | undefined }
| { type: 'SET_SELECTION' } & { selectionAndAnchor: SelectionAndAnchor }

export const initialState: State = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  invalidate: true,
  hasCompleteRow: false,
  orderBy: {},
  selectionAndAnchor: {
    selection: [],
    anchor: undefined,
  },
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'SET_ROWS':
    return {
      ...state,
      startIndex: action.start,
      rows: action.rows,
      invalidate: false,
      hasCompleteRow: state.hasCompleteRow || action.hasCompleteRow,
    }
  case 'SET_COLUMN_WIDTH': {
    const columnWidths = [...state.columnWidths]
    columnWidths[action.columnIndex] = action.columnWidth
    return { ...state, columnWidths }
  }
  case 'SET_COLUMN_WIDTHS':
    return { ...state, columnWidths: action.columnWidths }
  case 'SET_ORDER': {
    // Note: no need to invalidate the data, it will be done by useEffect
    return { ...state, orderBy: action.orderBy }
  }
  case 'DATA_CHANGED':
    // side effect: invalidate the downloaded data, and clear the selection
    return { ...state, invalidate: true, hasCompleteRow: false, selectionAndAnchor: { selection : [], anchor: undefined } }
  case 'SET_SELECTION':
    return { ...state, selectionAndAnchor: action.selectionAndAnchor }
  default:
    return state
  }
}

type HighTableProps = TableProps & {
  orderBy?: OrderBy
  onOrderByChange?: (orderBy: OrderBy) => void
  selection: SelectionAndAnchor
  onSelectionChange?: (selection: SelectionAndAnchor) => void
}

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
  selection,
  onSelectionChange,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: HighTableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  /**
   * Four modes:
   * - controlled (orderBy and onOrderByChange are defined): the parent controls the sort and receives the user interactions. No local state.
   * - controlled read-only (orderBy is defined, onOrderByChange is undefined): the parent controls the sort and the user interactions are disabled. No local state.
   * - uncontrolled (orderBy is undefined, onOrderByChange is defined): the component controls the sort and the user interactions. Local state.
   * - disabled (data is not sortable, or orderBy and onOrderByChange are undefined): the sort is hidden and the user interactions are disabled. No local state.
   */
  const [initialOrderBy] = useState<OrderBy | undefined>(propOrderBy)
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
      // eslint-disable-next-line prefer-destructuring
      orderBy = state.orderBy
    }
  }
  const getOnOrderByChange = useCallback(() => {
    if (!showOrderByInteractions || !data.sortable) {
      return undefined
    }
    return (orderBy: OrderBy) => {
      onOrderByChange?.(orderBy)
      if (!isOrderByControlled) {
        dispatch({ type: 'SET_ORDER', orderBy })
      }
    }
  }, [dispatch, onOrderByChange, isOrderByControlled, showOrderByInteractions, data.sortable])

  /**
   * Four modes:
   * - controlled (selection and onSelectionChange are defined): the parent controls the selection and receives the user interactions. No local state.
   * - controlled read-only (selection is defined, onSelectionChange is undefined): the parent controls the selection and the user interactions are disabled. No local state.
   * - uncontrolled (selection is undefined, onSelectionChange is defined): the component controls the selection and the user interactions. Local state.
   * - disabled (selection and onSelectionChange are undefined): the selection is hidden and the user interactions are disabled. No local state.
   */
  const [initialSelection] = useState<SelectionAndAnchor | undefined>(selection)
  const isSelectionControlled = initialSelection !== undefined
  const showSelectionInteractions = onSelectionChange !== undefined
  let selectionAndAnchor: SelectionAndAnchor | undefined
  if (isSelectionControlled) {
    if (selection === undefined) {
      console.warn('The component selection is controlled (is has no local state) because "selection" was initially defined. "selection" cannot be set to undefined now (it is set back to the initial value).')
      selectionAndAnchor = initialSelection
    } else {
      selectionAndAnchor = selection
    }
  } else {
    if (selection !== undefined) {
      console.warn('The component selection is uncontrolled (it only has a local state) because "selection" was initially undefined. "selection" cannot be set to a value now and is ignored.')
    }
    if (onSelectionChange === undefined) {
      console.warn('The component selection is disabled because "onSelectionChange" is undefined. If you want to enable selection, you must provide "onSelectionChange".')
      selectionAndAnchor = undefined
    } else {
      // eslint-disable-next-line prefer-destructuring
      selectionAndAnchor = state.selectionAndAnchor
    }
  }
  const getOnSelectionAndAnchorChange = useCallback(() => {
    if (!showSelectionInteractions) {
      return undefined
    }
    return (selectionAndAnchor: SelectionAndAnchor) => {
      onSelectionChange?.(selectionAndAnchor)
      if (!isSelectionControlled) {
        dispatch({ type: 'SET_SELECTION', selectionAndAnchor })
      }
    }
  }, [dispatch, onSelectionChange, isSelectionControlled, showSelectionInteractions])

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
    state={state}
    dispatch={dispatch}
  ></ControlledHighTable>
}
