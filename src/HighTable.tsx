import { useCallback, useReducer, useState } from 'react'
import type { InternalAction, InternalState, SelectionAndAnchor, TableProps } from './ControlledHighTable.js'
import ControlledHighTable from './ControlledHighTable.js'
export { stringify, throttle } from './ControlledHighTable.js'
export type { ControlledTableProps, InternalAction, InternalState, SelectionAndAnchor, TableProps } from './ControlledHighTable.js'
export {
  arrayDataFrame, AsyncRow, asyncRows,
  awaitRow,
  awaitRows, DataFrame,
  ResolvablePromise, resolvablePromise,
  resolvableRow, Row, sortableDataFrame,
  wrapPromise,
} from './dataframe.js'
export { rowCache } from './rowCache.js'
export type { Selection } from './selection.js'
export { ControlledHighTable, HighTable }

type State = InternalState & { selectionAndAnchor?: SelectionAndAnchor }

type Action = InternalAction
  | { type: 'SET_SELECTION' } & { selectionAndAnchor: SelectionAndAnchor }

export const initialState: State = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  invalidate: true,
  hasCompleteRow: false,
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
    if (state.orderBy === action.orderBy) {
      return state
    } else {
      // the selection is relative to the order, and must be reset if the order changes
      return { ...state, orderBy: action.orderBy, rows: [], selectionAndAnchor: { selection : [], anchor: undefined } }
    }
  }
  case 'DATA_CHANGED':
    return { ...state, invalidate: true, hasCompleteRow: false, selectionAndAnchor: { selection : [], anchor: undefined } }
  case 'SET_SELECTION':
    return { ...state, selectionAndAnchor: action.selectionAndAnchor }
  default:
    return state
  }
}

type HighTableProps = TableProps & {
  selection: SelectionAndAnchor
  onSelectionChange?: (selection: SelectionAndAnchor) => void
}

/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * selection: the selected rows and the anchor row. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state).
 * onSelectionChange: the callback to call when the selection changes. If undefined, the component selection is read-only if controlled (selection is set), or disabled if not.
 */
export default function HighTable({
  data,
  cacheKey,
  overscan = 20,
  padding = 20,
  focus = true,
  selection,
  onSelectionChange,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: HighTableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  /**
   * Four modes:
   * - controlled (selection and onSelectionChange are defined): the parent controls the selection and receives the user interactions. No local state.
   * - controlled read-only (selection is defined, onSelectionChange is undefined): the parent controls the selection and the user interactions are disabled. No local state.
   * - uncontrolled (selection is undefined, onSelectionChange is defined): the component controls the selection and the user interactions. Local state.
   * - disabled (selection and onSelectionChange are undefined): the selection is hidden and the user interactions are disabled. No local state.
   */
  const [initialSelection, _] = useState<SelectionAndAnchor | undefined>(selection)
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
    selectionAndAnchor={selectionAndAnchor}
    onSelectionAndAnchor={getOnSelectionAndAnchorChange()}
    onDoubleClickCell={onDoubleClickCell}
    onMouseDownCell={onMouseDownCell}
    onError={onError}
    state={state}
    dispatch={dispatch}
  ></ControlledHighTable>
}
