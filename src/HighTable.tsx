import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DataFrame, Row, asyncRows } from './dataframe.js'
import { SelectionAndAnchor, areAllSelected, extendFromAnchor, isSelected, toggleAll, toggleIndex } from './selection.js'
import { OrderBy } from './sort.js'
import TableHeader, { cellStyle } from './TableHeader.js'
export { AsyncRow, DataFrame, ResolvablePromise, Row, arrayDataFrame, asyncRows, awaitRow, awaitRows, resolvablePromise, resolvableRow, sortableDataFrame, wrapPromise } from './dataframe.js'
export { rowCache } from './rowCache.js'
export { SelectionAndAnchor } from './selection.js'
export type { Selection } from './selection.js'
export { OrderBy } from './sort.js'
export { HighTable }

/**
 * State of the component
 */
export type State = {
  columnWidths: Array<number | undefined> // width of each column
  invalidate: boolean // true if the data must be fetched again
  hasCompleteRow: boolean // true if at least one row is fully resolved (all of its cells)
  rows: Row[] // slice of the virtual table rows (sorted rows) to render as HTML. It might contain incomplete rows. Rows are expected to include __index__ if sorted.
  rowsOrderBy: OrderBy // order by column of the rows slice.
  startIndex: number // offset of the slice of sorted rows to render (rows[0] is the startIndex'th sorted row)
}

export type Action =
  | { type: 'SET_ROWS', start: number, rows: Row[], rowsOrderBy: OrderBy, hasCompleteRow: boolean }
  | { type: 'SET_COLUMN_WIDTH', columnIndex: number, columnWidth: number | undefined }
  | { type: 'SET_COLUMN_WIDTHS', columnWidths: Array<number | undefined> }
  | { type: 'DATA_CHANGED' }

export const initialState: State = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  rowsOrderBy: {},
  invalidate: true,
  hasCompleteRow: false,
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'SET_ROWS':
    return {
      ...state,
      startIndex: action.start,
      rows: action.rows,
      rowsOrderBy: action.rowsOrderBy,
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
  case 'DATA_CHANGED':
    return { ...state, invalidate: true, hasCompleteRow: false }
  default:
    return state
  }
}

const rowHeight = 33 // row height px

/**
 * Mouse event handler for a cell in the table.
 * @param event mouse event
 * @param col column index
 * @param row row index in the data frame
 */
type MouseEventCellHandler = (event: React.MouseEvent, col: number, row: number) => void

export interface TableProps {
  data: DataFrame
  cacheKey?: string // used to persist column widths
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  focus?: boolean // focus table on mount? (default true)
  onDoubleClickCell?: MouseEventCellHandler
  onMouseDownCell?: MouseEventCellHandler
  onError?: (error: Error) => void
  orderBy?: OrderBy // order by column. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  selectionAndAnchor?: SelectionAndAnchor // selection and anchor rows. If undefined, the selection is hidden and the interactions are disabled.
  onSelectionAndAnchorChange?: (selectionAndAnchor: SelectionAndAnchor) => void // callback to call when a user interaction changes the selection. The interactions are disabled if undefined.
}

function rowLabel(rowIndex?: number): string {
  if (rowIndex === undefined) return ''
  // rowIndex + 1 because the displayed row numbers are 1-based
  return (rowIndex + 1).toLocaleString()
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
  onOrderByChange: propOnOrderByChange,
  selectionAndAnchor: propSelection,
  onSelectionAndAnchorChange: propOnSelectionAndAnchorChange,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: TableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)
  /**
   * The component relies on the model of a virtual table which rows are ordered and only the visible rows are fetched and rendered as HTML <tr> elements.
   * We use two reference domains for the rows:
   * - data:          the index of a row in the original (unsorted) data frame is referred as dataIndex. The mouse event callbacks receive this index.
   * - virtual table: the index of a row in the virtual table (sorted) is referred as tableIndex. The selection uses this index, and thus depends on the order.
   *                  startIndex lives in the table domain: it's the first virtual row to be rendered in HTML.
   * data.rows(dataIndex, dataIndex + 1) is the same row as data.rows(tableIndex, tableIndex + 1, orderBy)
   */
  const { columnWidths, startIndex, rows, rowsOrderBy, invalidate, hasCompleteRow } = state

  /**
   * orderBy and onOrderByChange
   *
   * Four modes:
   * - controlled (orderBy and onOrderByChange are defined): the parent controls the sort and receives the user interactions. No local state.
   * - controlled read-only (orderBy is defined, onOrderByChange is undefined): the parent controls the sort and the user interactions are disabled. No local state.
   * - uncontrolled (orderBy is undefined, onOrderByChange is defined or undefined): the component controls the sort and the user interactions. Local state.
   * - disabled (data is not sortable): the sort is hidden and the user interactions are disabled. No local state.
   */
  const [initialOrderBy] = useState<OrderBy | undefined>(propOrderBy)
  const [localOrderBy, setLocalOrderBy] = useState<OrderBy | undefined>({})
  const isOrderByControlled = initialOrderBy !== undefined
  let enableOrderByInteractions = true
  let orderBy: OrderBy | undefined
  if (!data.sortable) {
    // The component sort is disabled because the data is not sortable.
    orderBy = undefined
    enableOrderByInteractions = false
  } else if (isOrderByControlled) {
    if (propOrderBy === undefined) {
      console.warn('The component sort is controlled (is has no local state) because "orderBy" was initially defined. "orderBy" cannot be set to undefined now (it is set back to the initial value).')
      orderBy = initialOrderBy
    } else {
      orderBy = propOrderBy
    }
    // read-only if onOrderByChange is undefined
    enableOrderByInteractions = propOnOrderByChange !== undefined
  } else {
    if (propOrderBy !== undefined) {
      console.warn('The component sort is uncontrolled (it only has a local state) because "orderBy" was initially undefined. "orderBy" cannot be set to a value now and is ignored.')
    }
    orderBy = localOrderBy
    enableOrderByInteractions = true
  }
  const onOrderByChange = useCallback((orderBy: OrderBy) => {
    if (!enableOrderByInteractions) {
      return
    }
    propOnOrderByChange?.(orderBy)
    if (!isOrderByControlled) {
      setLocalOrderBy(orderBy)
    }
  }, [propOnOrderByChange, isOrderByControlled, enableOrderByInteractions])

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
  const enableSelectionInteractions = propOnSelectionAndAnchorChange !== undefined
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
    if (propOnSelectionAndAnchorChange === undefined) {
      // The component selection is disabled because onSelectionAndAnchorChange is undefined. If you want to enable selection, you must provide onSelectionAndAnchorChange
      selectionAndAnchor = undefined
    } else {
      selectionAndAnchor = localSelection
    }
  }
  const onSelectionAndAnchorChange = useCallback((selectionAndAnchor: SelectionAndAnchor) => {
    if (!enableSelectionInteractions) {
      return
    }
    propOnSelectionAndAnchorChange?.(selectionAndAnchor)
    if (!isSelectionControlled) {
      setLocalSelection(selectionAndAnchor)
    }
  }, [propOnSelectionAndAnchorChange, isSelectionControlled, enableSelectionInteractions])

  const showSelection = selectionAndAnchor !== undefined
  const showSelectionControls = showSelection && enableSelectionInteractions
  const getOnSelectAllRows = useCallback(() => {
    if (!selectionAndAnchor || !onSelectionAndAnchorChange) return
    const { selection } = selectionAndAnchor
    return () => onSelectionAndAnchorChange({
      selection: toggleAll({ selection, length: data.numRows }),
      anchor: undefined,
    })
  }, [onSelectionAndAnchorChange, data.numRows, selectionAndAnchor])
  const getOnSelectRowClick = useCallback((tableIndex: number) => {
    if (!selectionAndAnchor || !onSelectionAndAnchorChange) return
    const { selection, anchor } = selectionAndAnchor
    return (event: React.MouseEvent) => {
      const useAnchor = event.shiftKey && selectionAndAnchor.anchor !== undefined
      if (useAnchor) {
        onSelectionAndAnchorChange({ selection: extendFromAnchor({ selection, anchor, index: tableIndex }), anchor })
      } else {
        onSelectionAndAnchorChange({ selection: toggleIndex({ selection, index: tableIndex }), anchor: tableIndex })
      }
    }
  }, [onSelectionAndAnchorChange, selectionAndAnchor])
  const allRowsSelected = useMemo(() => {
    if (!selectionAndAnchor) return false
    const { selection } = selectionAndAnchor
    return areAllSelected({ selection, length: data.numRows })
  }, [selectionAndAnchor, data.numRows])
  const isRowSelected = useCallback((tableIndex: number) => {
    if (!selectionAndAnchor) return undefined
    const { selection } = selectionAndAnchor
    return isSelected({ selection, index: tableIndex })
  }, [selectionAndAnchor])

  const offsetTopRef = useRef(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingRequest = useRef(0)
  const pendingUpdate = useRef(false)

  if (!data) throw new Error('HighTable: data is required')

  // total scrollable height
  const scrollHeight = (data.numRows + 1) * rowHeight

  // invalidate when data changes so that columns will auto-resize
  useEffect(() => {
    dispatch({ type: 'DATA_CHANGED' })
    onSelectionAndAnchorChange?.({ selection: [], anchor: undefined })
  }, [data, dispatch, onSelectionAndAnchorChange])

  // handle scrolling
  useEffect(() => {
    /**
     * Compute the rows to fetch based on the current scroll position.
     */
    async function handleScroll() {
      const clientHeight = scrollRef.current?.clientHeight || 100 // view window height
      const scrollTop = scrollRef.current?.scrollTop || 0 // scroll position

      // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
      const startView = Math.floor(data.numRows * scrollTop / scrollHeight)
      const endView = Math.ceil(data.numRows * (scrollTop + clientHeight) / scrollHeight)
      const start = Math.max(0, startView - overscan)
      const end = Math.min(data.numRows, endView + overscan)

      // Don't update if view is unchanged
      if (!invalidate && start === startIndex && rows.length === end - start && rowsOrderBy.column === orderBy?.column ) {
        return
      }

      if (isNaN(start)) throw new Error('invalid start row ' + start)
      if (isNaN(end)) throw new Error('invalid end row ' + end)
      if (end - start > 1000) throw new Error('attempted to render too many rows ' + (end - start) + ' table must be contained in a scrollable div')

      const offsetTop = Math.max(0, start - padding) * rowHeight

      // Fetch a chunk of rows from the data frame
      try {
        const requestId = ++pendingRequest.current
        const unwrapped = data.rows(start, end, orderBy?.column)
        const rowsChunk = asyncRows(unwrapped, end - start, data.header)

        const updateRows = throttle(() => {
          const resolved: Row[] = []
          let hasCompleteRow = false // true if at least one row is fully resolved
          for (const row of rowsChunk) {
            // Return only resolved values
            const resolvedRow: Row = {}
            let isRowComplete = true
            for (const [key, promise] of Object.entries(row)) {
              // it might or not include __index__
              if ('resolved' in promise) {
                resolvedRow[key] = promise.resolved
              } else {
                isRowComplete = false
              }
            }
            if (isRowComplete) hasCompleteRow = true
            resolved.push(resolvedRow)
          }
          offsetTopRef.current = offsetTop
          dispatch({ type: 'SET_ROWS', start, rows: resolved, hasCompleteRow, rowsOrderBy: { column: orderBy?.column } })
        }, 10)
        updateRows() // initial update

        // Subscribe to data updates
        for (const row of rowsChunk) {
          for (const [_, promise] of Object.entries(row)) {
            promise.then(() => {
              if (pendingRequest.current === requestId) {
                updateRows()
              }
            }).catch(() => {})
          }
        }

        // Await all pending promises
        for (const row of rowsChunk) {
          for (const promise of Object.values(row)) {
            await promise
          }
        }

        // if user scrolled while fetching, fetch again
        if (pendingUpdate.current) {
          pendingUpdate.current = false
          handleScroll()
        }
      } catch (error) {
        onError(error as Error)
      }
    }
    // update
    handleScroll()

    // scroll listeners
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    return () => {
      scroller?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data, invalidate, orderBy?.column, overscan, padding, rows.length, rowsOrderBy.column, startIndex, scrollHeight, onError, dispatch])

  /**
   * Validate row length
   */
  function rowError(row: Row, index?: number): string | undefined {
    // __index__ is considered a reserved field - an error will be displayed if a column is named '__index__' in data.header
    const numKeys = Object.keys(row).filter(d => d !== '__index__').length
    if (numKeys > 0 && numKeys !== data.header.length) {
      return `Row ${rowLabel(index)} length ${numKeys} does not match header length ${data.header.length}`
    }
  }

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])

  /**
   * Render a table cell <td> with title and optional custom rendering
   *
   * @param value cell value
   * @param col column index
   * @param row row index. If undefined, onDoubleClickCell and onMouseDownCell will not be called.
   */
  function Cell(value: any, col: number, row?: number): ReactNode {
    // render as truncated text
    let str = stringify(value)
    let title: string | undefined
    if (typeof str === 'string') {
      if (str.length > 400) str = `${str.slice(0, 397)}\u2026` // ...
      if (str.length > 100) title = str
    }
    return <td
      className={str === undefined ? 'pending' : undefined}
      key={col}
      onDoubleClick={e => row === undefined ? console.warn('Cell onDoubleClick is cancelled because row index is undefined') : onDoubleClickCell?.(e, col, row)}
      onMouseDown={e => row === undefined ? console.warn('Cell onMouseDown is cancelled because row index is undefined') : onMouseDownCell?.(e, col, row)}
      style={memoizedStyles[col]}
      title={title}>
      {str}
    </td>
  }

  // focus table on mount so arrow keys work
  useEffect(() => {
    if (focus) {
      tableRef.current?.focus()
    }
  }, [focus])

  /**
   * Get the row index in original (unsorted) data frame, and in the sorted virtual table.
   *
   * @param rowIndex row index in the "rows" slice
   *
   * @returns an object with two properties:
   *  dataIndex:  row index in the original (unsorted) data frame
   *  tableIndex: row index in the virtual table (sorted)
   */
  const getRowIndexes = useCallback((rowIndex: number): { dataIndex?: number, tableIndex: number } => {
    const tableIndex = startIndex + rowIndex
    const dataIndex = orderBy?.column === undefined
      ? tableIndex
      : rowIndex >= 0 && rowIndex < rows.length && '__index__' in rows[rowIndex] && typeof rows[rowIndex].__index__ === 'number'
        ? rows[rowIndex].__index__
        : undefined
    return { dataIndex, tableIndex }
  }, [rows, startIndex, orderBy])

  // add empty pre and post rows to fill the viewport
  const prePadding = Array.from({ length: Math.min(padding, startIndex) }, () => [])
  const postPadding = Array.from({
    length: Math.min(padding, data.numRows - startIndex - rows.length),
  }, () => [])

  // fixed corner width based on number of rows
  const cornerWidth = Math.ceil(Math.log10(data.numRows + 1)) * 4 + 22
  const cornerStyle = useMemo(() => cellStyle(cornerWidth), [cornerWidth])

  const setColumnWidths = useCallback((columnWidths: Array<number | undefined>) => {
    dispatch({ type: 'SET_COLUMN_WIDTHS', columnWidths })
  }, [dispatch])

  const setColumnWidth = useCallback((columnIndex: number, columnWidth: number | undefined) => {
    dispatch({ type: 'SET_COLUMN_WIDTH', columnIndex, columnWidth })
  }, [dispatch])

  // don't render table if header is empty
  if (!data.header.length) return

  return <div className={`table-container${showSelectionControls ? ' selectable' : ''}${showSelection ? ' show-selection' : ''}`}>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          aria-readonly={true}
          aria-colcount={data.header.length + 1 /* don't forget the selection column */}
          aria-rowcount={data.numRows + 1 /* don't forget the header row */}
          className={`table${enableOrderByInteractions ? ' sortable' : ''}`}
          ref={tableRef}
          role='grid'
          style={{ top: `${offsetTopRef.current}px` }}
          tabIndex={0}>
          <TableHeader
            cacheKey={cacheKey}
            columnWidths={columnWidths}
            dataReady={hasCompleteRow}
            header={data.header}
            orderBy={orderBy}
            setColumnWidth={setColumnWidth}
            setColumnWidths={setColumnWidths}
            onOrderByChange={onOrderByChange}
          />
          <tbody>
            {prePadding.map((_, prePaddingIndex) => {
              const { tableIndex, dataIndex } = getRowIndexes(-prePadding.length + prePaddingIndex)
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} >
                <th scope="row" style={cornerStyle}>{
                  rowLabel(dataIndex)
                }</th>
              </tr>
            })}
            {rows.map((row, rowIndex) => {
              const { tableIndex, dataIndex } = getRowIndexes(rowIndex)
              const selected = isRowSelected(tableIndex)
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} title={rowError(row, dataIndex)}
                className={selected ? 'selected' : ''}
                aria-selected={selected}
              >
                <th scope="row" style={cornerStyle} onClick={getOnSelectRowClick(tableIndex)}>
                  <span>{rowLabel(dataIndex)}</span>
                  { showSelection && <input type='checkbox' checked={selected} readOnly /> }
                </th>
                {data.header.map((col, colIndex) =>
                  Cell(row[col], colIndex, dataIndex)
                )}
              </tr>
            })}
            {postPadding.map((_, postPaddingIndex) => {
              const { tableIndex, dataIndex } = getRowIndexes(rows.length + postPaddingIndex)
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} >
                <th scope="row" style={cornerStyle} >{
                  rowLabel(dataIndex)
                }</th>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
    <div className='table-corner' style={cornerStyle} onClick={getOnSelectAllRows()}>
      <span>&nbsp;</span>
      { showSelection && <input type='checkbox' checked={allRowsSelected} readOnly /> }
    </div>
    <div className='mock-row-label' style={cornerStyle}>&nbsp;</div>
  </div>
}


/**
 * Robust stringification of any value, including json and bigints.
 */
export function stringify(value: any): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toLocaleString()
  if (typeof value === 'bigint') return value.toLocaleString()
  if (Array.isArray(value)) return `[${value.map(stringify).join(', ')}]`
  if (value === null || value === undefined) return JSON.stringify(value)
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') {
    return `{${Object.entries(value).map(([k, v]) => `${k}: ${stringify(v)}`).join(', ')}}`
  }
  return value.toString()
}

/**
 * Throttle a function to run at most once every `wait` milliseconds.
 */
export function throttle(fn: () => void, wait: number): () => void {
  let inCooldown = false
  let pending = false

  function invoke() {
    fn()
    pending = false
    inCooldown = true
    // check if there are pending calls after cooldown
    setTimeout(() => {
      inCooldown = false
      if (pending) {
        // trailing call
        invoke()
      }
    }, wait)
  }

  return () => {
    if (!inCooldown) {
      // leading call
      invoke()
    } else {
      // schedule trailing call
      pending = true
    }
  }
}
