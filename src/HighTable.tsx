import { ReactNode, useEffect, useMemo, useReducer, useRef } from 'react'
import TableHeader, { cellStyle } from './TableHeader.js'

const rowHeight = 33 // row height px
const overscan = 30 // number of rows to fetch outside of the viewport
const padding = 30 // number of padding rows to render outside of the viewport

/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  rows(start: number, end: number): Promise<any[][]>
}

interface TableProps {
  data: DataFrame
  onDoubleClickCell?: (row: number, col: number) => void
  onError?: (error: Error) => void
}

type State = {
  columnWidths: Array<number | undefined>
  firstLoad: boolean
  offsetTop: number
  startIndex: number
  rows: any[][]
  dataReady: boolean
}

type Action =
  | { type: 'INIT_LOAD' }
  | { type: 'SET_ROWS'; start: number; rows: any[][] }
  | { type: 'SET_ERROR'; error: Error }
  | { type: 'SET_COLUMN_WIDTH'; columnIndex: number, columnWidth: number | undefined }
  | { type: 'SET_COLUMN_WIDTHS'; columnWidths: Array<number | undefined> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'INIT_LOAD':
    return { ...state, firstLoad: false }
  case 'SET_ROWS':
    return {
      ...state,
      dataReady: true,
      startIndex: action.start,
      rows: action.rows,
      offsetTop: Math.max(0, action.start - padding) * rowHeight,
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
  default:
    return state
  }
}

const initialState = {
  columnWidths: [],
  firstLoad: true,
  offsetTop: 0,
  startIndex: 0,
  rows: [],
  dataReady: false,
}

/**
 * Render a table with streaming rows on demand from a DataFrame.
 */
export default function HighTable({ data, onDoubleClickCell, onError = console.error }: TableProps) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const { columnWidths, firstLoad, offsetTop, startIndex, rows, dataReady } = state

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

      // skip fetch if the rows requested haven't changed
      if (start === startIndex && end === startIndex + rows.length) return

      // Fetch a chunk of rows from the data frame
      pendingRequest.current = data.rows(start, end).then(updatedRows => {
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
        pendingRequest.current = undefined
        onError(error)
      })
    }

    // fetch initial chunk
    if (firstLoad) {
      dispatch({ type: 'INIT_LOAD' })
      handleScroll()
    }

    // scroll listeners
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    return () => {
      scroller?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data, firstLoad, offsetTop, rows.length, scrollHeight, startIndex, onError])

  /**
   * Validate row length
   */
  function rowError(row: any[], rowIndex: number): string | undefined {
    if (row.length > 0 && row.length !== data.header.length) {
      return `Row ${rowIndex + 1} length ${row.length} does not match header length ${data.header.length}`
    }
  }

  /**
   * Render a table cell <td> with title and optional custom rendering
   */
  function Cell(value: any, col: number, row: number): ReactNode {
    const style = cellStyle(columnWidths[col])
    // render as truncated text
    let str = stringify(value)
    let title: string | undefined
    if (typeof str === 'string') {
      title = str.length > 200 ? str : undefined
      str = str.slice(0, 200)
    }
    return <td
      key={col}
      onDoubleClick={() => onDoubleClickCell?.(row, col)}
      style={style}
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

  return <div className='table-container'>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          className='table'
          ref={tableRef}
          style={{ top: `${offsetTop}px` }}
          tabIndex={0}>
          <TableHeader
            columnWidths={columnWidths}
            setColumnWidth={(columnIndex, columnWidth) => dispatch({ type: 'SET_COLUMN_WIDTH', columnIndex, columnWidth })}
            setColumnWidths={columnWidths => dispatch({ type: 'SET_COLUMN_WIDTHS', columnWidths })}
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
                  {(startIndex + rowIndex + 1).toLocaleString()}
                </td>
                {Array.from(row).map((value, col) => Cell(value, col, startIndex + rowIndex))}
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
