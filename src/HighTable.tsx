import { useReducer } from 'react'
import type { Action, State, TableProps } from './ControlledHighTable.js'
import ControlledHighTable from './ControlledHighTable.js'
export type { Action, ControlledTableProps, State, TableProps } from './ControlledHighTable.js'
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

export const initialState = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  invalidate: true,
  hasCompleteRow: false,
  selection: [],
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
      return { ...state, orderBy: action.orderBy, rows: [], selection: [], anchor: undefined }
    }
  }
  case 'DATA_CHANGED':
    return { ...state, invalidate: true, hasCompleteRow: false, selection: [], anchor: undefined }
  case 'SET_SELECTION':
    return { ...state, selection: action.selection, anchor: action.anchor }
  default:
    return state
  }
}

/**
 * Render a table with streaming rows on demand from a DataFrame.
 */
export default function HighTable({
  data,
  cacheKey,
  overscan = 20,
  padding = 20,
  focus = true,
  selectable = false,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: TableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  return <ControlledHighTable
    data={data}
    cacheKey={cacheKey}
    overscan={overscan}
    padding={padding}
    focus={focus}
    selectable={selectable}
    onDoubleClickCell={onDoubleClickCell}
    onMouseDownCell={onMouseDownCell}
    onError={onError}
    state={state}
    dispatch={dispatch}
  ></ControlledHighTable>
}
