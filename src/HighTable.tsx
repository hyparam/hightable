import { ReactNode, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { DataFrame } from './dataframe.js'
import { useInputState } from './hooks.js'
import { PartialRow } from './row.js'
import { Selection, areAllSelected, extendFromAnchor, isSelected, toggleAll, toggleIndex } from './selection.js'
import TableHeader, { OrderBy, cellStyle } from './TableHeader.js'
export { DataFrame, arrayDataFrame, sortableDataFrame } from './dataframe.js'
export { ResolvablePromise, resolvablePromise, wrapPromise } from './promise.js'
export { AsyncRow, Cells, PartialRow, ResolvableRow, Row, asyncRows, awaitRow, awaitRows, resolvableRow } from './row.js'
export { rowCache } from './rowCache.js'
export { Selection } from './selection.js'
export { OrderBy } from './TableHeader.js'
export { HighTable }

/**
 * A slice of the (optionally sorted) rows to render as HTML.
 */
interface Slice {
  offset: number // offset (slice.rows[0] corresponds to the row #offset in the sorted data frame)
  orderedBy: OrderBy // the order used to fetch the rows slice.
  rows: PartialRow[] // slice of the (optionally sorted) rows to render as HTML. The rows might be incomplete (not all the cells, or no index).
}

/**
 * State of the component
 */
type State = {
  data: DataFrame // data frame used in the last rendering
  hasCompleteRow: boolean // true if at least one row is fully resolved (all of its cells)
  invalidate: boolean // true if the data must be fetched again
  slice: Slice // slice of the (optionally sorted) rows to render as HTML
}

type Action =
  | { type: 'SET_ROWS', start: number, rows: PartialRow[], orderBy: OrderBy, hasCompleteRow: boolean }
  | { type: 'DATA_CHANGED', data: DataFrame }

function reducer(state: State, action: Action): State {
  switch (action.type) {
  case 'SET_ROWS':
    return {
      ...state,
      hasCompleteRow: state.hasCompleteRow || action.hasCompleteRow,
      invalidate: false,
      slice: {
        offset: action.start,
        orderedBy: action.orderBy,
        rows: action.rows,
      },
    }
  case 'DATA_CHANGED':
    return { ...state, data: action.data, invalidate: true, hasCompleteRow: false }
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
  selection?: Selection // selection and anchor rows. If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The interactions are disabled if undefined.
  stringify?: (value: any) => string | undefined
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
  selection: propSelection,
  onSelectionChange: propOnSelectionChange,
  onDoubleClickCell,
  onMouseDownCell,
  onError = console.error,
  stringify = stringifyDefault,
}: TableProps) {
  const initialState: State = {
    data,
    hasCompleteRow: false,
    invalidate: true,
    slice: { offset: 0, orderedBy: {}, rows: [] },
  }
  const [state, dispatch] = useReducer(reducer, initialState)
  const [rowsRange, setRowsRange] = useState({ start: 0, end: 0 })

  const [columnWidths, setColumnWidths] = useState<Array<number | undefined>>([])
  const setColumnWidth = useCallback((columnIndex: number, columnWidth: number | undefined) => {
    setColumnWidths(columnWidths => {
      const newColumnWidths = [...columnWidths]
      newColumnWidths[columnIndex] = columnWidth
      return newColumnWidths
    })
  }, [setColumnWidths])

  /**
   * The component relies on the model of a virtual table which rows are ordered and only the
   * visible rows are fetched (slice) and rendered as HTML <tr> elements.
   *
   * We use two reference domains for the rows:
   * - data:          the index of a row in the original (unsorted) data frame is referred as
   *                  dataIndex. It's the `index` field of the AsyncRow objects in the data frame.
   *                  The mouse event callbacks receive this index.
   * - virtual table: the index of a row in the virtual table (sorted) is referred as tableIndex.
   *                  slice.offset lives in the table domain: it's the first virtual row to be
   *                  rendered in HTML.
   *
   * The same row can be obtained as:
   * - data.rows(dataIndex, dataIndex + 1)
   * - data.rows(tableIndex, tableIndex + 1, orderBy)
   */
  const { slice, invalidate, hasCompleteRow, data: previousData } = state

  // Sorting is disabled if the data is not sortable
  const {
    value: orderBy,
    onChange: onOrderByChange,
    enableInteractions: enableOrderByInteractions,
  } = useInputState<OrderBy>({
    value: propOrderBy,
    onChange: propOnOrderByChange,
    defaultValue: {},
    disabled: !data.sortable,
  })

  // Selection is disabled if the parent passed no props
  const isSelectionDisabled = propSelection === undefined && propOnSelectionChange === undefined
  const {
    value: selection,
    onChange: onSelectionChange,
    enableInteractions: enableSelectionInteractions,
    isControlled: isSelectionControlled,
  } = useInputState<Selection>({
    value: propSelection,
    onChange: propOnSelectionChange,
    defaultValue: { ranges: [], anchor: undefined },
    disabled: isSelectionDisabled,
  })

  const showSelection = selection !== undefined
  const showSelectionControls = showSelection && enableSelectionInteractions
  const showCornerSelection = showSelectionControls || showSelection && areAllSelected({ ranges: selection.ranges, length: data.numRows })
  const getOnSelectAllRows = useCallback(() => {
    if (!selection || !onSelectionChange) return
    const { ranges } = selection
    return () => onSelectionChange({
      ranges: toggleAll({ ranges, length: data.numRows }),
      anchor: undefined,
    })
  }, [onSelectionChange, data.numRows, selection])
  const getOnSelectRowClick = useCallback((tableIndex: number) => {
    if (!selection || !onSelectionChange) return
    const { ranges, anchor } = selection
    return (event: React.MouseEvent) => {
      const useAnchor = event.shiftKey && selection.anchor !== undefined
      if (useAnchor) {
        onSelectionChange({ ranges: extendFromAnchor({ ranges, anchor, index: tableIndex }), anchor })
      } else {
        onSelectionChange({ ranges: toggleIndex({ ranges, index: tableIndex }), anchor: tableIndex })
      }
    }
  }, [onSelectionChange, selection])
  const allRowsSelected = useMemo(() => {
    if (!selection) return false
    const { ranges } = selection
    return areAllSelected({ ranges, length: data.numRows })
  }, [selection, data.numRows])
  const isRowSelected = useCallback((tableIndex: number) => {
    if (!selection) return undefined
    const { ranges } = selection
    return isSelected({ ranges, index: tableIndex })
  }, [selection])

  // total scrollable height
  const scrollHeight = (data.numRows + 1) * rowHeight
  const offsetTop = Math.max(0, rowsRange.start - padding) * rowHeight

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingRequest = useRef(0)

  if (!data) throw new Error('HighTable: data is required')

  // invalidate when data changes so that columns will auto-resize
  if (data !== previousData) {
    dispatch({ type: 'DATA_CHANGED', data })
    // if uncontrolled, reset the selection (otherwise, it's the responsibility of the parent to do it if the data changes)
    if (!isSelectionControlled) {
      onSelectionChange?.({ ranges: [], anchor: undefined })
    }
  }

  // handle scrolling and window resizing
  useEffect(() => {
    /**
     * Compute the dimensions based on the current scroll position.
     */

    function handleScroll() {
      const clientHeight = scrollRef.current?.clientHeight || 100 // view window height
      const scrollTop = scrollRef.current?.scrollTop || 0 // scroll position

      // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
      const startView = Math.floor(data.numRows * scrollTop / scrollHeight)
      const endView = Math.ceil(data.numRows * (scrollTop + clientHeight) / scrollHeight)
      const start = Math.max(0, startView - overscan)
      const end = Math.min(data.numRows, endView + overscan)

      if (isNaN(start)) throw new Error('invalid start row ' + start)
      if (isNaN(end)) throw new Error('invalid end row ' + end)
      if (end - start > 1000) throw new Error('attempted to render too many rows ' + (end - start) + ' table must be contained in a scrollable div')

      setRowsRange({ start, end })
    }
    // run once
    handleScroll()

    // scroll listeners
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)

    return () => {
      scroller?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [data.numRows, overscan, padding, scrollHeight])

  // fetch rows
  useEffect(() => {
    /**
     * Fetch the rows in the range [start, end) and update the state.
    */
    async function fetchRows() {
      const { start, end } = rowsRange

      // Don't update if the view, or slice, is unchanged
      if (!invalidate && start === slice.offset && end === slice.offset + slice.rows.length && slice.orderedBy.column === orderBy?.column ) {
        return
      }

      if (start === end) {
        dispatch({ type: 'SET_ROWS', start, rows: [], hasCompleteRow: false, orderBy: { column: orderBy?.column } })
        return
      }

      // Fetch a chunk of rows from the data frame
      try {
        const requestId = ++pendingRequest.current
        const rowsChunk = data.rows({ start, end, orderBy: orderBy?.column })

        const updateRows = throttle(() => {
          const resolved: PartialRow[] = []
          let hasCompleteRow = false // true if at least one row is fully resolved
          for (const asyncRow of rowsChunk) {
            const resolvedRow: PartialRow = { cells: {} }
            let isRowComplete = true
            for (const [key, promise] of Object.entries(asyncRow.cells)) {
              if ('resolved' in promise) {
                resolvedRow.cells[key] = promise.resolved
              } else {
                isRowComplete = false
              }
            }
            if ('resolved' in asyncRow.index) {
              resolvedRow.index = asyncRow.index.resolved
            } else {
              isRowComplete = false
            }
            if (isRowComplete) hasCompleteRow = true
            resolved.push(resolvedRow)
          }
          dispatch({ type: 'SET_ROWS', start, rows: resolved, hasCompleteRow, orderBy: { column: orderBy?.column } })
        }, 10)
        updateRows() // initial update

        // Subscribe to data updates
        for (const asyncRow of rowsChunk) {
          for (const promise of [asyncRow.index, ...Object.values(asyncRow.cells)] ) {
            promise.then(() => {
              if (pendingRequest.current === requestId) {
                updateRows()
              }
            }).catch(() => {})
          }
        }

        // Await all pending promises
        await Promise.all(rowsChunk.flatMap(asyncRow => [asyncRow.index, ...Object.values(asyncRow.cells)]))
      } catch (error) {
        onError(error as Error)
      }
    }
    // update
    fetchRows()
  }, [data, invalidate, onError, orderBy?.column, slice.rows.length, slice.orderedBy.column, rowsRange, slice.offset])

  /**
   * Validate row length
   */
  function rowError(row: PartialRow): string | undefined {
    const numKeys = Object.keys(row.cells).length
    if (numKeys > 0 && numKeys !== data.header.length) {
      return `Row ${rowLabel(row.index)} length ${numKeys} does not match header length ${data.header.length}`
    }
  }

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])
  const onDoubleClick = useCallback((e: React.MouseEvent, col: number, row?: number) => {
    if (row === undefined) {
      console.warn('Cell onDoubleClick is cancelled because row index is undefined')
      return
    }
    onDoubleClickCell?.(e, col, row)
  }, [onDoubleClickCell])
  const onMouseDown = useCallback((e: React.MouseEvent, col: number, row?: number) => {
    if (row === undefined) {
      console.warn('Cell onMouseDown is cancelled because row index is undefined')
      return
    }
    onMouseDownCell?.(e, col, row)
  }, [onMouseDownCell])

  /**
   * Render a table cell <td> with title and optional custom rendering
   *
   * @param value cell value
   * @param col column index
   * @param row row index. If undefined, onDoubleClickCell and onMouseDownCell will not be called.
   */
  const Cell = useCallback((value: any, col: number, row?: number): ReactNode => {
    // render as truncated text
    let str = stringify(value)
    let title: string | undefined
    if (typeof str === 'string') {
      if (str.length > 400) str = `${str.slice(0, 397)}\u2026` // ...
      if (str.length > 100) title = str
    }
    return <td
      role="cell"
      className={str === undefined ? 'pending' : undefined}
      key={col}
      onDoubleClick={e => onDoubleClick(e, col, row)}
      onMouseDown={e => onMouseDown(e, col, row)}
      style={memoizedStyles[col]}
      title={title}>
      {str}
    </td>
  }, [memoizedStyles, onDoubleClick, onMouseDown, stringify])

  // focus table on mount so arrow keys work
  useEffect(() => {
    if (focus) {
      tableRef.current?.focus()
    }
  }, [focus])

  // add empty pre and post rows to fill the viewport
  const prePadding = Array.from({ length: Math.min(padding, slice.offset) }, () => [])
  const postPadding = Array.from({
    length: Math.min(padding, data.numRows - slice.offset - slice.rows.length),
  }, () => [])

  // fixed corner width based on number of rows
  const cornerWidth = Math.ceil(Math.log10(data.numRows + 1)) * 4 + 22
  const cornerStyle = useMemo(() => cellStyle(cornerWidth), [cornerWidth])

  // don't render table if header is empty
  if (!data.header.length) return

  const ariaColCount = data.header.length + 1 // don't forget the selection column
  const ariaRowCount = data.numRows + 1 // don't forget the header row
  return <div className={`table-container${showSelectionControls ? ' selectable' : ''}`}>
    <div className='table-scroll' ref={scrollRef}>
      <div style={{ height: `${scrollHeight}px` }}>
        <table
          aria-readonly={true}
          aria-colcount={ariaColCount}
          aria-rowcount={ariaRowCount}
          aria-multiselectable={showSelectionControls}
          className={`table${enableOrderByInteractions ? ' sortable' : ''}`}
          ref={tableRef}
          role='grid'
          style={{ top: `${offsetTop}px` }}
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
          <tbody role="rowgroup">
            {prePadding.map((_, prePaddingIndex) => {
              const tableIndex = slice.offset - prePadding.length + prePaddingIndex
              const ariaRowIndex = tableIndex + 2 // 1-based + the header row
              return <tr role="row" key={tableIndex} aria-rowindex={ariaRowIndex} >
                <th scope="row" role="rowheader" style={cornerStyle}></th>
              </tr>
            })}
            {slice.rows.map((row, rowIndex) => {
              const tableIndex = slice.offset + rowIndex
              const dataIndex = row?.index
              const selected = isRowSelected(tableIndex)
              const key = dataIndex ?? `missing-index-at-row-${tableIndex}`
              const ariaRowIndex = tableIndex + 2 // 1-based + the header row
              return <tr role="row" key={key} aria-rowindex={ariaRowIndex} title={rowError(row)}
                className={selected ? 'selected' : ''}
                aria-selected={selected}
              >
                <th scope="row" role="rowheader" style={cornerStyle} onClick={getOnSelectRowClick(tableIndex)}>
                  <span>{rowLabel(dataIndex)}</span>
                  { showSelection && <input type='checkbox' checked={selected} readOnly /> }
                </th>
                {data.header.map((col, colIndex) =>
                  Cell(row?.cells[col], colIndex, dataIndex)
                )}
              </tr>
            })}
            {postPadding.map((_, postPaddingIndex) => {
              const tableIndex = slice.offset + slice.rows.length + postPaddingIndex
              const ariaRowIndex = tableIndex + 2 // 1-based + the header row
              return <tr role="row" key={tableIndex} aria-rowindex={ariaRowIndex} >
                <th scope="row" role="rowheader" style={cornerStyle} ></th>
              </tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
    <div className={`table-corner${showCornerSelection ? ' show-corner-selection' : ''}`} style={cornerStyle} onClick={getOnSelectAllRows()}>
      <span>&nbsp;</span>
      { showCornerSelection && <input type='checkbox' checked={allRowsSelected} readOnly /> }
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
const stringifyDefault = stringify

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
