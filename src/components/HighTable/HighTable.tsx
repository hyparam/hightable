import { MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataFrame } from '../../helpers/dataframe.js'
import { PartialRow } from '../../helpers/row.js'
import { Selection, areAllSelected, isSelected, toggleAll, toggleIndexInSelection, toggleRangeInSelection, toggleRangeInTable } from '../../helpers/selection.js'
import { OrderBy, areEqualOrderBy } from '../../helpers/sort.js'
import { leftCellStyle } from '../../helpers/width.js'
import { ColumnWidthProvider } from '../../hooks/useColumnWidth.js'
import { useInputState } from '../../hooks/useInputState.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import { throttle } from '../../utils/throttle.js'
import Cell from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
import { formatRowNumber, rowError } from './HighTable.helpers.js'
import styles from './HighTable.module.css'

/**
 * A slice of the (optionally sorted) rows to render as HTML.
 */
interface Slice {
  offset: number // offset (slice.rows[0] corresponds to the row #offset in the sorted data frame)
  orderedBy: OrderBy // the order used to fetch the rows slice.
  rows: PartialRow[] // slice of the (optionally sorted) rows to render as HTML. The rows might be incomplete (not all the cells, or no index).
  data: DataFrame // the data frame used to fetch the slice
}

const rowHeight = 33 // row height px

interface Props {
  data: DataFrame
  cacheKey?: string // used to persist column widths
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  focus?: boolean // focus table on mount? (default true)
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onError?: (error: Error) => void
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  stringify?: (value: unknown) => string | undefined
  className?: string // additional class names
  styled?: boolean // use styled component? (default true)
}

/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * orderBy: the order used to fetch the rows. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state). If the data cannot be sorted, it's ignored.
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
  className = '',
  styled = true,
}: Props) {
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

  const [slice, setSlice] = useState<Slice | undefined>(undefined)
  const [rowsRange, setRowsRange] = useState({ start: 0, end: 0 })
  const [hasCompleteRow, setHasCompleteRow] = useState(false)

  // TODO(SL): remove this state and only rely on the data frame for these operations?
  // ie. cache the previous sort indexes in the data frame itself
  const [ranksMap, setRanksMap] = useState<Map<string, Promise<number[]>>>(() => new Map())

  // Sorting is disabled if the data is not sortable
  const {
    value: orderBy,
    onChange: onOrderByChange,
    enableInteractions: enableOrderByInteractions,
  } = useInputState<OrderBy>({
    value: propOrderBy,
    onChange: propOnOrderByChange,
    defaultValue: [],
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
    if (!selection) return
    const { ranges } = selection
    return () => { onSelectionChange({
      ranges: toggleAll({ ranges, length: data.numRows }),
      anchor: undefined,
    }) }
  }, [onSelectionChange, data.numRows, selection])

  const pendingSelectionRequest = useRef(0)
  const getOnSelectRowClick = useCallback(({ tableIndex, dataIndex }: {tableIndex: number, dataIndex: number}) => {
    if (!selection) return
    async function onSelectRowClick(event: MouseEvent) {
      if (!selection) return
      const useAnchor = event.shiftKey && selection.anchor !== undefined

      if (!useAnchor) {
        // single row toggle
        onSelectionChange(toggleIndexInSelection({ selection, index: dataIndex }))
        return
      }

      if (!orderBy || orderBy.length === 0) {
        // no sorting, toggle the range
        onSelectionChange(toggleRangeInSelection({ selection, index: dataIndex }))
        return
      }

      // sorting, toggle the range in the sorted order
      const requestId = ++pendingSelectionRequest.current
      const newSelection = await toggleRangeInTable({
        selection,
        tableIndex,
        orderBy,
        data,
        ranksMap,
        setRanksMap,
      })
      if (requestId === pendingSelectionRequest.current) {
        // only update the selection if the request is still the last one
        onSelectionChange(newSelection)
      }
    }
    return (event: MouseEvent): void => {
      void onSelectRowClick(event)
    }
  }, [data, onSelectionChange, orderBy, ranksMap, selection])
  const allRowsSelected = useMemo(() => {
    if (!selection) return false
    const { ranges } = selection
    return areAllSelected({ ranges, length: data.numRows })
  }, [selection, data.numRows])
  const isRowSelected = useCallback((dataIndex: number | undefined) => {
    if (!selection) return undefined
    if (dataIndex === undefined) return undefined
    const { ranges } = selection
    return isSelected({ ranges, index: dataIndex })
  }, [selection])

  // total scrollable height
  const scrollHeight = (data.numRows + 1) * rowHeight
  const offsetTop = slice ? Math.max(0, slice.offset - padding) * rowHeight : 0

  const scrollRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLTableElement>(null)
  const pendingRequest = useRef(0)

  // invalidate when data changes so that columns will auto-resize
  if (slice && data !== slice.data) {
    // delete the slice
    setSlice(undefined)
    // reset the flag, the column widths will be recalculated
    setHasCompleteRow(false)
    // delete the cached sort indexes
    setRanksMap(new Map())
    // if uncontrolled, reset the selection (if controlled, it's the responsibility of the parent to do it)
    if (!isSelectionControlled) {
      onSelectionChange({ ranges: [], anchor: undefined })
    }
  }

  // handle scrolling and window resizing
  useEffect(() => {
    /**
     * Compute the dimensions based on the current scroll position.
     */

    function handleScroll() {
      // view window height (0 is not allowed - the syntax is verbose, but makes it clear)
      const currentClientHeight = scrollRef.current?.clientHeight
      const clientHeight = currentClientHeight === undefined || currentClientHeight === 0 ? 100 : currentClientHeight
      // scroll position
      const scrollTop = scrollRef.current?.scrollTop ?? 0

      // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
      const startView = Math.floor(data.numRows * scrollTop / scrollHeight)
      const endView = Math.ceil(data.numRows * (scrollTop + clientHeight) / scrollHeight)
      const start = Math.max(0, startView - overscan)
      const end = Math.min(data.numRows, endView + overscan)

      if (isNaN(start)) throw new Error(`invalid start row ${start}`)
      if (isNaN(end)) throw new Error(`invalid end row ${end}`)
      if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)

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
      const currentOrderBy = orderBy ?? []

      // Don't update if the view, or slice, is unchanged
      if (slice && slice.data === data && start === slice.offset && end === slice.offset + slice.rows.length && areEqualOrderBy(slice.orderedBy, currentOrderBy) ) {
        return
      }

      if (start === end) {
        const slice = {
          offset: start,
          rows: [],
          orderedBy: currentOrderBy,
          data,
        }
        setSlice(slice)
        return
      }

      // Fetch a chunk of rows from the data frame
      try {
        const requestId = ++pendingRequest.current
        const rowsChunk = data.rows({ start, end, orderBy: currentOrderBy })

        const updateRows = throttle(() => {
          const resolved: PartialRow[] = []
          for (const asyncRow of rowsChunk) {
            const resolvedRow: PartialRow = { cells: {} }
            for (const [key, promise] of Object.entries(asyncRow.cells)) {
              if ('resolved' in promise) {
                resolvedRow.cells[key] = promise.resolved
              }
            }
            if ('resolved' in asyncRow.index) {
              resolvedRow.index = asyncRow.index.resolved
            }
            resolved.push(resolvedRow)
          }
          const slice = {
            offset: start,
            rows: resolved,
            orderedBy: currentOrderBy,
            data,
          }
          setSlice(slice)
          if (!hasCompleteRow) {
            // check if at least one row is complete
            const columnsSet = new Set(slice.data.header)
            if (slice.rows.some(row => {
              const keys = Object.keys(row.cells)
              return keys.length === columnsSet.size && keys.every(key => columnsSet.has(key))
            })) {
              setHasCompleteRow(true)
            }
          }
        }, 10)
        updateRows() // initial update

        // Subscribe to data updates
        for (const asyncRow of rowsChunk) {
          for (const promise of [asyncRow.index, ...Object.values(asyncRow.cells)] ) {
            void promise.then(() => {
              if (pendingRequest.current === requestId) {
                updateRows()
              }
            })
          }
        }

        // Await all pending promises
        await Promise.all(rowsChunk.flatMap(asyncRow => [asyncRow.index, ...Object.values(asyncRow.cells)]))
      } catch (error) {
        onError(error as Error)
      }
    }
    // update
    void fetchRows()
  }, [data, onError, orderBy, slice, rowsRange, hasCompleteRow])

  const getOnDoubleClickCell = useCallback((col: number, row?: number) => {
    // TODO(SL): give feedback (a specific class on the cell element?) about why the double click is disabled?
    if (!onDoubleClickCell || row === undefined) return
    return (e: MouseEvent) => {
      onDoubleClickCell(e, col, row)
    }
  }, [onDoubleClickCell])
  const getOnMouseDownCell = useCallback((col: number, row?: number) => {
    // TODO(SL): give feedback (a specific class on the cell element?) about why the double click is disabled?
    if (!onMouseDownCell || row === undefined) return
    return (e: MouseEvent) => {
      onMouseDownCell(e, col, row)
    }
  }, [onMouseDownCell])

  // focus table on mount so arrow keys work
  useEffect(() => {
    if (focus) {
      tableRef.current?.focus()
    }
  }, [focus])

  // add empty pre and post rows to fill the viewport
  const offset = slice?.offset ?? 0
  const rowsLength = slice?.rows.length ?? 0
  const prePadding = Array.from({ length: Math.min(padding, offset) }, () => [])
  const postPadding = Array.from({
    length: Math.min(padding, data.numRows - offset - rowsLength),
  }, () => [])

  // minimum left column width based on number of rows - it depends on CSS, so it's
  // only a bottom limit
  const cornerStyle = useMemo(() => {
    const minWidth = Math.ceil(Math.log10(data.numRows + 1)) * 4 + 22
    return leftCellStyle(minWidth)
  }, [data.numRows])

  // don't render table if header is empty
  if (!data.header.length) return

  const ariaColCount = data.header.length + 1 // don't forget the selection column
  const ariaRowCount = data.numRows + 1 // don't forget the header row
  return <ColumnWidthProvider localStorageKey={`${cacheKey}:column-widths`}>
    <div className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`}>
      <div className={styles.tableScroll} ref={scrollRef}>
        <div style={{ height: `${scrollHeight}px` }}>
          <table
            aria-readonly={true}
            aria-colcount={ariaColCount}
            aria-rowcount={ariaRowCount}
            aria-multiselectable={showSelectionControls}
            ref={tableRef}
            role='grid'
            style={{ top: `${offsetTop}px` }}
            tabIndex={0}>
            <thead role="rowgroup">
              <Row ariaRowIndex={1} >
                <TableCorner
                  onClick={getOnSelectAllRows()}
                  checked={allRowsSelected}
                  showCheckBox={showCornerSelection}
                  style={cornerStyle}
                >&nbsp;</TableCorner>
                <TableHeader
                  dataReady={hasCompleteRow}
                  header={data.header}
                  orderBy={orderBy}
                  onOrderByChange={onOrderByChange}
                  sortable={enableOrderByInteractions}
                />
              </Row>
            </thead>
            <tbody role="rowgroup">
              {prePadding.map((_, prePaddingIndex) => {
                const tableIndex = offset - prePadding.length + prePaddingIndex
                return (
                  <Row key={tableIndex} ariaRowIndex={tableIndex + 2} >
                    <RowHeader style={cornerStyle} />
                  </Row>
                )
              })}
              {slice?.rows.map((row, rowIndex) => {
                const tableIndex = slice.offset + rowIndex
                const dataIndex = row.index
                const selected = isRowSelected(row.index) ?? false
                return (
                  <Row
                    key={tableIndex}
                    selected={selected}
                    ariaRowIndex={tableIndex + 2}
                    title={rowError(row, data.header.length)}
                  >
                    <RowHeader
                      style={cornerStyle}
                      onClick={dataIndex === undefined ? undefined : getOnSelectRowClick({ tableIndex, dataIndex })}
                      checked={selected}
                      showCheckBox={showSelection}
                    >{formatRowNumber(dataIndex)}</RowHeader>
                    {data.header.map((column, columnIndex) => {
                      // Note: the resolved cell value can be undefined
                      const hasResolved = column in row.cells
                      const value = row.cells[column]
                      return <Cell
                        key={columnIndex}
                        onDoubleClick={getOnDoubleClickCell(columnIndex, dataIndex)}
                        onMouseDown={getOnMouseDownCell(columnIndex, dataIndex)}
                        stringify={stringify}
                        value={value}
                        columnIndex={columnIndex}
                        hasResolved={hasResolved}
                      />
                    })}
                  </Row>
                )
              })}
              {postPadding.map((_, postPaddingIndex) => {
                const tableIndex = offset + rowsLength + postPaddingIndex
                return (
                  <Row key={tableIndex} ariaRowIndex={tableIndex + 2}>
                    <RowHeader style={cornerStyle} />
                  </Row>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel} style={cornerStyle}>&nbsp;</div>
    </div>
  </ColumnWidthProvider>
}
