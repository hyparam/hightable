import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { AsyncRow, DataFrame, Row, asyncRows } from './dataframe.js'
import { Selection, areAllSelected, extendFromAnchor, isSelected, toggleAll, toggleIndex } from './selection.js'
import TableHeader, { cellStyle } from './TableHeader.js'
export {
  AsyncRow,
  DataFrame,
  ResolvablePromise,
  Row,
  arrayDataFrame,
  asyncRows,
  awaitRow,
  awaitRows,
  resolvablePromise,
  resolvableRow,
  sortableDataFrame,
  wrapPromise,
} from './dataframe.js'
export { rowCache } from './rowCache.js'
export { HighTable }

const rowHeight = 33 // row height px

/**
 * Mouse event handler for a cell in the table.
 * @param event mouse event
 * @param col column index
 * @param row row index in the data frame
 */
type MouseEventCellHandler = (event: React.MouseEvent, col: number, row: number) => void

interface TableProps {
  data: DataFrame
  cacheKey?: string // used to persist column widths
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  focus?: boolean // focus table on mount? (default true)
  tableControl?: TableControl // control the table from outside
  selectable?: boolean // enable row selection (default false)
  onDoubleClickCell?: MouseEventCellHandler
  onMouseDownCell?: MouseEventCellHandler
  onError?: (error: Error) => void
}

/**
 * State of the component
 */
type State = {
  columnWidths: Array<number | undefined> // width of each column
  invalidate: boolean // true if the data must be fetched again
  hasCompleteRow: boolean // true if at least one row is fully resolved (all of its cells)
  rows: AsyncRow[] // slice of the virtual table rows (sorted rows) to render as HTML
  startIndex: number // offset of the slice of sorted rows to render (rows[0] is the startIndex'th sorted row)
  orderBy?: string // column name to sort by
  selection: Selection // rows selection. The values are indexes of the virtual table (sorted rows), and thus depend on the order.
  anchor?: number // anchor row used as a reference for shift+click selection. It's a virtual table index (sorted), and thus depends on the order.
}

type Action =
  | { type: 'SET_ROWS', start: number, rows: AsyncRow[], hasCompleteRow: boolean }
  | { type: 'SET_COLUMN_WIDTH', columnIndex: number, columnWidth: number | undefined }
  | { type: 'SET_COLUMN_WIDTHS', columnWidths: Array<number | undefined> }
  | { type: 'SET_ORDER', orderBy: string | undefined }
  | { type: 'DATA_CHANGED' }
  | { type: 'SET_SELECTION', selection: Selection, anchor?: number }

function reducer(state: State, action: Action): State {
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

const initialState: State = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  invalidate: true,
  hasCompleteRow: false,
  selection: [],
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
  tableControl,
  selectable = false,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
}: TableProps) {
  /**
   * The component relies on the model of a virtual table which rows are ordered and only the visible rows are fetched and rendered as HTML <tr> elements.
   * We use two reference domains for the rows:
   * - data:          the index of a row in the original (unsorted) data frame is referred as dataIndex. The mouse event callbacks receive this index.
   * - virtual table: the index of a row in the virtual table (sorted) is referred as tableIndex. The selection uses this index, and thus depends on the order.
   *                  startIndex lives in the table domain: it's the first virtual row to be rendered in HTML.
   * data.rows(dataIndex, dataIndex + 1) is the same row as data.rows(tableIndex, tableIndex + 1, orderBy)
   */
  const [state, dispatch] = useReducer(reducer, initialState)

  const { anchor, columnWidths, startIndex, rows, orderBy, invalidate, hasCompleteRow, selection } = state
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
  }, [data])

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
      if (!invalidate && start === startIndex && rows.length === end - start) {
        return
      }

      if (isNaN(start)) throw new Error('invalid start row ' + start)
      if (isNaN(end)) throw new Error('invalid end row ' + end)
      if (end - start > 1000) throw new Error('attempted to render too many rows ' + (end - start) + ' table must be contained in a scrollable div')

      const offsetTop = Math.max(0, start - padding) * rowHeight

      // Fetch a chunk of rows from the data frame
      try {
        const requestId = ++pendingRequest.current
        const unwrapped = data.rows(start, end, orderBy)
        const rows = asyncRows(unwrapped, end - start, data.header)

        const updateRows = throttle(() => {
          const resolved: Row[] = []
          let hasCompleteRow = false // true if at least one row is fully resolved
          for (const row of rows) {
            // Return only resolved values
            const resolvedRow: Row = {}
            let isRowComplete = true
            for (const [key, promise] of Object.entries(row)) {
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
          dispatch({ type: 'SET_ROWS', start, rows: resolved, hasCompleteRow })
        }, 10)
        updateRows() // initial update

        // Subscribe to data updates
        for (const row of rows) {
          for (const [key, promise] of Object.entries(row)) {
            promise.then(() => {
              if (pendingRequest.current === requestId) {
                updateRows()
              }
            }).catch(() => {})
          }
        }

        // Await all pending promises
        for (const row of rows) {
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
  }, [data, invalidate, orderBy, overscan, padding, rows.length, startIndex, scrollHeight, onError])

  // handle remote control of the table (e.g. sorting)
  useEffect(() => {
    tableControl?.publisher.subscribe(dispatch)
    return () => {
      tableControl?.publisher.unsubscribe(dispatch)
    }
  }, [tableControl])

  const rowLabel = useCallback((rowIndex: number): string => {
    // rowIndex + 1 because the displayed row numbers are 1-based
    return (rowIndex + 1).toLocaleString()
  }, [
    // no dependencies, but we could add a setting to allow 0-based row numbers
  ])

  /**
   * Validate row length
   */
  function rowError(row: Record<string, any>, dataIndex: number): string | undefined {
    if (row.length > 0 && row.length !== data.header.length) {
      return `Row ${rowLabel(dataIndex)} length ${row.length} does not match header length ${data.header.length}`
    }
  }

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])

  /**
   * Render a table cell <td> with title and optional custom rendering
   *
   * @param value cell value
   * @param col column index
   * @param row row index in the original (unsorted) data frame
   */
  function Cell(value: any, col: number, row: number): ReactNode {
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
      onDoubleClick={e => onDoubleClickCell?.(e, col, row)}
      onMouseDown={e => onMouseDownCell?.(e, col, row)}
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
   * @param sliceIndex row index in the "rows" slice
   *
   * @returns an object with two properties:
   *  dataIndex:  row index in the original (unsorted) data frame
   *  tableIndex: row index in the virtual table (sorted)
   */
  const getRowIndexes = useCallback((sliceIndex: number): { dataIndex: number, tableIndex: number } => {
    const tableIndex = startIndex + sliceIndex
    /// TODO(SL): improve row typing to get __index__ type if sorted
    /// Maybe even better to always have an __index__, sorted or not
    const index = rows[sliceIndex].__index__
    const resolved = typeof index === 'object' ? index.resolved : index
    return {
      dataIndex: resolved ?? tableIndex, // .__index__ only exists if the rows are sorted. If not sorted, use the table index
      tableIndex,
    }
  }, [rows, startIndex])


  const onRowNumberClick = useCallback(({ useAnchor, tableIndex }: {useAnchor: boolean, tableIndex: number}) => {
    if (!selectable) return false
    if (useAnchor) {
      const newSelection = extendFromAnchor({ selection, anchor, index: tableIndex })
      // did not throw: we can set the anchor (keep the same)
      dispatch({ type: 'SET_SELECTION', selection: newSelection, anchor })
    } else {
      const newSelection = toggleIndex({ selection, index: tableIndex })
      // did not throw: we can set the anchor
      dispatch({ type: 'SET_SELECTION', selection: newSelection, anchor: tableIndex })
    }
  }, [selection, anchor])

  // add empty pre and post rows to fill the viewport
  const prePadding = Array.from({ length: Math.min(padding, startIndex) }, () => [])
  const postPadding = Array.from({
    length: Math.min(padding, data.numRows - startIndex - rows.length),
  }, () => [])

  // fixed corner width based on number of rows
  const cornerWidth = Math.ceil(Math.log10(data.numRows + 1)) * 4 + 22
  const cornerStyle = useMemo(() => cellStyle(cornerWidth), [cornerWidth])

  // don't render table if header is empty
  if (!data.header.length) return

  return <div className={`table-container${selectable ? ' selectable' : ''}`}>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          aria-readonly={true}
          aria-colcount={data.header.length + 1 /* don't forget the selection column */}
          aria-rowcount={data.numRows + 1 /* don't forget the header row */}
          className={`table${data.sortable ? ' sortable' : ''}`}
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
            setColumnWidth={(columnIndex, columnWidth) => dispatch({ type: 'SET_COLUMN_WIDTH', columnIndex, columnWidth })}
            setColumnWidths={columnWidths => dispatch({ type: 'SET_COLUMN_WIDTHS', columnWidths })}
            setOrderBy={orderBy => data.sortable && dispatch({ type: 'SET_ORDER', orderBy })} />
          <tbody>
            {prePadding.map((_, prePaddingIndex) => {
              const tableIndex = startIndex - prePadding.length + prePaddingIndex
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} >
                <th scope="row" style={cornerStyle}>
                  {
                    /// TODO(SL): if the data is sorted, this sequence of row labels is incorrect and might include duplicate
                    /// labels with respect to the next slice of rows. Better to hide this number if the data is sorted?
                    rowLabel(tableIndex)
                  }
                </th>
              </tr>
            })}
            {rows.map((row, sliceIndex) => {
              const { tableIndex, dataIndex } = getRowIndexes(sliceIndex)
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} title={rowError(row, dataIndex)}
                className={isSelected({ selection, index: tableIndex }) ? 'selected' : ''}
                aria-selected={isSelected({ selection, index: tableIndex })}
              >
                <th scope="row" style={cornerStyle} onClick={event => onRowNumberClick({ useAnchor: event.shiftKey, tableIndex })}>
                  <span>{
                    /// TODO(SL): we might want to show two columns: one for the tableIndex (for selection) and one for the dataIndex (to refer to the original data ids)
                    rowLabel(dataIndex)
                  }</span>
                  <input type='checkbox' checked={isSelected({ selection, index: tableIndex })} readOnly={true} />
                </th>
                {data.header.map((col, colIndex) =>
                  Cell(row[col], colIndex, dataIndex)
                )}
              </tr>
            })}
            {postPadding.map((_, postPaddingIndex) => {
              const tableIndex = startIndex + rows.length + postPaddingIndex
              return <tr key={tableIndex} aria-rowindex={tableIndex + 2 /* 1-based + the header row */} >
                <th scope="row" style={cornerStyle} >
                  {
                    /// TODO(SL): if the data is sorted, this sequence of row labels is incorrect and might include duplicate
                    /// labels with respect to the previous slice of rows. Better to hide this number if the data is sorted?
                    rowLabel(tableIndex)
                  }
                </th>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
    <div className='table-corner' style={cornerStyle} onClick={() => selectable && dispatch({ type: 'SET_SELECTION', selection: toggleAll({ selection, length: rows.length }), anchor: undefined })}>
      <span>&nbsp;</span>
      <input type='checkbox' checked={areAllSelected({ selection, length: rows.length })} readOnly={true} />
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

interface Publisher<T> {
  subscribe: (fn: (data: T) => void) => void
  unsubscribe: (fn: (data: T) => void) => void
}

interface PubSub<T> extends Publisher<T> {
  publish: (data: T) => void
}

export interface TableControl {
  publisher: Publisher<Action>
  setOrderBy: (columnName: string) => void
}

function createPubSub<T>(): PubSub<T> {
  const subscribers = new Set<(data: T) => void>()
  return {
    subscribe(fn: (data: T) => void) {
      subscribers.add(fn)
    },
    unsubscribe(fn: (data: T) => void) {
      subscribers.delete(fn)
    },
    publish(data: T) {
      for (const fn of subscribers) {
        fn(data)
      }
    },
  }
}

export function createTableControl(): TableControl {
  const publisher = createPubSub<Action>()
  return {
    publisher,
    setOrderBy(columnName: string) {
      publisher.publish({ type: 'SET_ORDER', orderBy: columnName })
    },
  }
}
