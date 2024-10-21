import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { AsyncRow, DataFrame, Row, asyncRows } from './dataframe.js'
import TableHeader, { cellStyle } from './TableHeader.js'
export { rowCache } from './rowCache.js'
export {
  AsyncRow, DataFrame, ResolvablePromise, Row, asyncRows, awaitRows, resolvablePromise, resolvableRow, sortableDataFrame, wrapPromise,
} from './dataframe.js'
export { HighTable }

const rowHeight = 33 // row height px

interface TableProps {
  data: DataFrame
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  onDoubleClickCell?: (col: number, row: number) => void
  onError?: (error: Error) => void
}

type State = {
  columnWidths: Array<number | undefined>
  dataReady: boolean
  startIndex: number
  rows: AsyncRow[]
  orderBy?: string
  pending: boolean
}

type Action =
  | { type: 'SET_ROWS', start: number, rows: AsyncRow[], hasCompleteRow: boolean }
  | { type: 'SET_COLUMN_WIDTH', columnIndex: number, columnWidth: number | undefined }
  | { type: 'SET_COLUMN_WIDTHS', columnWidths: Array<number | undefined> }
  | { type: 'SET_ORDER', orderBy: string | undefined }
  | { type: 'SET_PENDING', pending: boolean }
  | { type: 'DATA_CHANGED' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'SET_ROWS':
    return {
      ...state,
      startIndex: action.start,
      rows: action.rows,
      dataReady: state.dataReady || action.hasCompleteRow,
    }
  case 'SET_COLUMN_WIDTH': {
    const columnWidths = [...state.columnWidths]
    columnWidths[action.columnIndex] = action.columnWidth
    return { ...state, columnWidths }
  }
  case 'SET_COLUMN_WIDTHS':
    return { ...state, columnWidths: action.columnWidths }
  case 'SET_ORDER':
    return { ...state, orderBy: action.orderBy }
  case 'SET_PENDING':
    return { ...state, pending: action.pending }
  case 'DATA_CHANGED':
    return { ...state, dataReady: false }
  default:
    return state
  }
}

const initialState = {
  columnWidths: [],
  startIndex: 0,
  rows: [],
  dataReady: false,
  pending: false,
}

/**
 * Render a table with streaming rows on demand from a DataFrame.
 */
export default function HighTable({
  data,
  overscan = 20,
  padding = 20,
  onDoubleClickCell,
  onError = console.error,
}: TableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { columnWidths, startIndex, rows, orderBy, dataReady, pending } = state
  const offsetTopRef = useRef(0)

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingRequest = useRef(0)
  const pendingUpdate = useRef(false)

  if (!data) throw new Error('HighTable: data is required')

  // total scrollable height
  const scrollHeight = (data.numRows + 1) * rowHeight

  // handle scrolling
  useEffect(() => {
    /**
     * Compute the rows to fetch based on the current scroll position.
     */
    async function handleScroll() {
      const clientHeight = scrollRef.current?.clientHeight || 100 // view window height
      const scrollTop = scrollRef.current?.scrollTop || 0 // scroll position

      // determine rows to fetch based on current scroll position
      // TODO: compute the floor delta so offsetTop adjustment is smooth
      let start = Math.floor(data.numRows * scrollTop / scrollHeight)
      let end = Math.ceil(data.numRows * (scrollTop + clientHeight) / scrollHeight)
      start = Math.max(0, start - overscan)
      end = Math.min(data.numRows, end + overscan)

      if (isNaN(start)) throw new Error('invalid start row ' + start)
      if (isNaN(end)) throw new Error('invalid end row ' + end)

      const offsetTop = Math.max(0, scrollTop - padding * rowHeight)

      // Fetch a chunk of rows from the data frame
      try {
        const requestId = ++pendingRequest.current
        const unwrapped = data.rows(start, end, orderBy)
        const rows = asyncRows(unwrapped, end - start, data.header)

        const updateRows = throttle(() => {
          const resolved = []
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
        dispatch({ type: 'SET_PENDING', pending: false })
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
  }, [data, orderBy, overscan, padding, scrollHeight, onError])

  /**
   * Validate row length
   */
  function rowError(row: Record<string, any>, rowIndex: number): string | undefined {
    if (row.length > 0 && row.length !== data.header.length) {
      return `Row ${rowIndex + 1} length ${row.length} does not match header length ${data.header.length}`
    }
  }

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])

  /**
   * Render a table cell <td> with title and optional custom rendering
   */
  function Cell(value: any, col: number, row: number, rowIndex?: number): ReactNode {
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
      onDoubleClick={() => onDoubleClickCell?.(col, rowIndex ?? row)}
      style={memoizedStyles[col]}
      title={title}>
      {str}
    </td>
  }

  // focus table on mount so arrow keys work
  useEffect(() => {
    tableRef.current?.focus()
  }, [])

  // reset dataReady when data changes so that columns will auto-resize
  useEffect(() => {
    dispatch({ type: 'DATA_CHANGED' })
  }, [data])

  const rowNumber = useCallback((rowIndex: number) => {
    return rows[rowIndex].__index__ ?? rowIndex + startIndex + 1
  }, [rows, startIndex])

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

  return <div className={pending ? 'table-container pending' : 'table-container'}>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          aria-colcount={data.header.length}
          aria-rowcount={data.numRows}
          className={data.sortable ? 'table sortable' : 'table'}
          ref={tableRef}
          role='grid'
          style={{ top: `${offsetTopRef.current}px` }}
          tabIndex={0}>
          <TableHeader
            columnWidths={columnWidths}
            dataReady={dataReady}
            header={data.header}
            orderBy={orderBy}
            setColumnWidth={(columnIndex, columnWidth) => dispatch({ type: 'SET_COLUMN_WIDTH', columnIndex, columnWidth })}
            setColumnWidths={columnWidths => dispatch({ type: 'SET_COLUMN_WIDTHS', columnWidths })}
            setOrderBy={orderBy => data.sortable && dispatch({ type: 'SET_ORDER', orderBy })} />
          <tbody>
            {prePadding.map((row, rowIndex) =>
              <tr key={startIndex - prePadding.length + rowIndex}>
                <td style={cornerStyle}>
                  {(startIndex - prePadding.length + rowIndex + 1).toLocaleString()}
                </td>
              </tr>
            )}
            {rows.map((row, rowIndex) =>
              <tr key={startIndex + rowIndex} title={rowError(row, rowIndex)}>
                <td style={cornerStyle}>
                  {rowNumber(rowIndex).toLocaleString()}
                </td>
                {data.header.map((col, colIndex) =>
                  Cell(row[col], colIndex, startIndex + rowIndex, row.__index__?.resolved)
                )}
              </tr>
            )}
            {postPadding.map((row, rowIndex) =>
              <tr key={startIndex + rows.length + rowIndex}>
                <td style={cornerStyle}>
                  {(startIndex + rows.length + rowIndex + 1).toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    <div className='table-corner' style={cornerStyle}>&nbsp;</div>
    <div className='mock-row-label' style={cornerStyle}>&nbsp;</div>
  </div>
}

/**
 * Robust stringification of any value, including json and bigints.
 */
export function stringify(value: any): string | undefined {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toLocaleString()
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
function throttle(fn: () => void, wait: number): () => void {
  let last = 0
  let pending = false
  return () => {
    const now = Date.now()
    if (now - last > wait) {
      last = now
      fn()
    } else if (!pending) {
      // trailing edge
      pending = true
      const remaining = wait - (now - last)
      setTimeout(() => {
        last = Date.now()
        pending = false
        fn()
      }, remaining)
    }
  }
}
