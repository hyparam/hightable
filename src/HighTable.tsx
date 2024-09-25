import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { DataFrame, sortableDataFrame } from './dataframe.js'
import TableHeader, { cellStyle } from './TableHeader.js'
export { DataFrame, HighTable, sortableDataFrame }

const rowHeight = 33 // row height px
const padding = 20 // number of padding rows to render outside of the viewport

interface TableProps {
  data: DataFrame
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  onDoubleClickCell?: (row: number, col: number) => void
  onError?: (error: Error) => void
}

type State = {
  columnWidths: Array<number | undefined>
  offsetTop: number
  startIndex: number
  rows: Record<string, any>[]
  orderBy?: string
  dataReady: boolean
  pending: boolean
}

type Action =
  | { type: 'SET_ROWS'; start: number; rows: Record<string, any>[] }
  | { type: 'SET_ERROR'; error: Error }
  | { type: 'SET_COLUMN_WIDTH'; columnIndex: number, columnWidth: number | undefined }
  | { type: 'SET_COLUMN_WIDTHS'; columnWidths: Array<number | undefined> }
  | { type: 'SET_ORDER'; orderBy: string | undefined }
  | { type: 'SET_PENDING'; pending: boolean }

function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'SET_ROWS':
    return {
      ...state,
      startIndex: action.start,
      rows: action.rows,
      offsetTop: Math.max(0, action.start - padding) * rowHeight,
      dataReady: true,
      pending: false,
    }
  case 'SET_ERROR':
    console.error(action.error)
    return state
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
  default:
    return state
  }
}

const initialState = {
  columnWidths: [],
  offsetTop: 0,
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
  onDoubleClickCell,
  onError = console.error
}: TableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { columnWidths, offsetTop, startIndex, rows, orderBy, dataReady, pending } = state

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const latestRequestRef = useRef(0)
  const pendingRequest = useRef<Promise<void>>()
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
      const tableHeight = tableRef.current?.clientHeight || 0

      // determine rows to fetch based on current scroll position
      // TODO: compute the floor delta so offsetTop adjustment is smooth
      let start = Math.floor(data.numRows * scrollTop / scrollHeight)
      let end = Math.ceil(data.numRows * (scrollTop + clientHeight) / scrollHeight)
      start = Math.max(0, start - overscan)
      end = Math.min(data.numRows, end + overscan)

      if (isNaN(start)) throw new Error('invalid start row ' + start)
      if (isNaN(end)) throw new Error('invalid end row ' + end)

      // TODO: always update rendered rows, but use blanks if data is not loaded

      // User scrolled so far that the table is out of view.
      // Update position BEFORE fetching rows, otherwise the header will jump.
      const isNearBottom = scrollHeight - offsetTop - tableHeight < overscan * rowHeight
      const isBelow = !isNearBottom && offsetTop + tableHeight - clientHeight < scrollTop
      const isAbove = scrollTop < offsetTop
      if (isBelow || isAbove) {
        // Replace rows with blanks and reset position
        dispatch({ type: 'SET_ROWS', start, rows: Array.from({ length: end - start }, () => []) })
      }

      // skip overlapping requests, but always request latest at the end
      if (pendingRequest.current) {
        pendingUpdate.current = true
        return
      }
      const requestId = ++latestRequestRef.current

      // Fetch a chunk of rows from the data frame
      dispatch({ type: 'SET_PENDING', pending: true })
      pendingRequest.current = data.rows(start, end, orderBy).then(updatedRows => {
        if (end - start !== updatedRows.length) {
          onError(new Error(`dataframe rows expected ${end - start} received ${updatedRows.length}`))
        }
        pendingRequest.current = undefined
        dispatch({ type: 'SET_ROWS', start, rows: updatedRows })

        if (requestId !== latestRequestRef.current) {
          // TODO: stale requests should never happen
          console.log('request', requestId, 'is stale')
        }

        // if user scrolled while fetching, fetch again
        if (pendingUpdate.current) {
          pendingUpdate.current = false
          handleScroll()
        }
      }).catch(error => {
        dispatch({ type: 'SET_PENDING', pending: false })
        pendingRequest.current = undefined
        onError(error)
      })
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
  }, [data, orderBy, scrollHeight, onError])

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
  function Cell(value: any, col: number, row: number): ReactNode {
    // render as truncated text
    let str = stringify(value)
    let title: string | undefined
    if (typeof str === 'string') {
      if (str.length > 400) str = `${str.slice(0, 397)}\u2026` // ...
      if (str.length > 100) title = str
    }
    return <td
      key={col}
      onDoubleClick={() => onDoubleClickCell?.(row, col)}
      style={memoizedStyles[col]}
      title={title}>
      {str}
    </td>
  }

  // focus table on mount so arrow keys work
  useEffect(() => {
    tableRef.current?.focus()
  }, [])

  // don't render table if header is empty
  if (!data.header.length) return

  // add empty pre and post rows to fill the viewport
  const prePadding = Array.from({ length: Math.min(padding, startIndex) }, () => [])
  const postPadding = Array.from({
    length: Math.min(padding, data.numRows - startIndex - rows.length),
  }, () => [])

  // fixed corner width based on number of rows
  const cornerWidth = Math.ceil(Math.log10(data.numRows + 1)) * 4 + 22
  const cornerStyle = useMemo(() => cellStyle(cornerWidth), [cornerWidth])

  const rowNumber = useCallback((rowIndex: number) => {
    return rows[rowIndex].__index__ ?? rowIndex + startIndex + 1
  }, [rows, startIndex])

  return <div className={pending ? 'table-container pending' : 'table-container'}>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          aria-colcount={data.header.length}
          aria-rowcount={data.numRows}
          className={data.sortable ? 'table sortable' : 'table'}
          ref={tableRef}
          role='grid'
          style={{ top: `${offsetTop}px` }}
          tabIndex={0}>
          <TableHeader
            columnWidths={columnWidths}
            orderBy={orderBy}
            setColumnWidth={(columnIndex, columnWidth) => dispatch({ type: 'SET_COLUMN_WIDTH', columnIndex, columnWidth })}
            setColumnWidths={columnWidths => dispatch({ type: 'SET_COLUMN_WIDTHS', columnWidths })}
            setOrderBy={orderBy => data.sortable && dispatch({ type: 'SET_ORDER', orderBy })}
            dataReady={dataReady}
            header={data.header} />
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
                {data.header.map((col, colIndex) => Cell(row[col], colIndex, startIndex + rowIndex))}
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
