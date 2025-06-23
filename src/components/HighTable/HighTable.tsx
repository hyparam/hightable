import { CSSProperties, KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import { DataFrame } from '../../helpers/dataframe/index.js'
import { Selection, areAllSelected, isSelected, toggleIndexInSelection, toggleRangeInSelection } from '../../helpers/selection.js'
import { OrderBy } from '../../helpers/sort.js'
import { cellStyle, getClientWidth, getOffsetWidth } from '../../helpers/width.js'
import { CellsNavigationProvider, useCellsNavigation } from '../../hooks/useCellsNavigation.js'
import { ColumnStatesProvider, useColumnStates } from '../../hooks/useColumnStates.js'
import { DataProvider, useData } from '../../hooks/useData.js'
import { OrderByProvider, useOrderBy } from '../../hooks/useOrderBy.js'
import { SelectionProvider, useSelection } from '../../hooks/useSelection.js'
import { useTableConfig } from '../../hooks/useTableConfig.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
import { formatRowNumber } from './HighTable.helpers.js'
import styles from './HighTable.module.css'

const rowHeight = 33 // row height px
const minWidth = 50 // minimum width of a cell in px, used to compute the column widths

interface Props {
  data: DataFrame
  columnConfiguration?: ColumnConfiguration
  cacheKey?: string // used to persist column widths. If undefined, the column widths are not persisted. It is expected to be unique for each table.
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  focus?: boolean // focus table on mount? (default true)
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  onError?: (error: Error) => void
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  stringify?: (value: unknown) => string | undefined
  className?: string // additional class names for the component
  columnClassNames?: (string | undefined)[] // list of additional class names for the header and cells of each column. The index in this array corresponds to the column index in columns
  styled?: boolean // use styled component? (default true)
}

const defaultPadding = 20
export const defaultOverscan = 20
const ariaOffset = 2 // 1-based index, +1 for the header
export const columnStatesSuffix = ':column:states' // suffix used to store the column states in local storage

/**
 * Render a table with streaming rows on demand from a DataFrame.
 *
 * orderBy: the order used to fetch the rows. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state). If the data cannot be sorted, it's ignored.
 * onOrderByChange: the callback to call when the order changes. If undefined, the component order is read-only if controlled (orderBy is set), or disabled if not (or if the data cannot be sorted).
 * selection: the selected rows and the anchor row. If set, the component is controlled, and the property cannot be unset (undefined) later. If undefined, the component is uncontrolled (internal state).
 * onSelectionChange: the callback to call when the selection changes. If undefined, the component selection is read-only if controlled (selection is set), or disabled if not.
 */
export default function HighTable(props: Props) {
  return (
    <DataProvider data={props.data} onError={props.onError ?? console.error}>
      <HighTableData {...props} />
    </DataProvider>
  )
}

type PropsData = Omit<Props, 'data'>

function HighTableData(props: PropsData) {
  const { data, numRows, key } = useData()
  const { cacheKey, orderBy, onOrderByChange, selection, onSelectionChange } = props
  const ariaColCount = data.header.length + 1 // don't forget the selection column
  const ariaRowCount = numRows + 1 // don't forget the header row

  return (
    /* important: key={key} ensures the local state is recreated if the data has changed */
    <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange} disabled={true}>
      {/* <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange} disabled={!data.sortable}></OrderByProvider> */
      /* TODO(SL): enable sorting when the DataFrame supports it */}
      <SelectionProvider selection={selection} onSelectionChange={onSelectionChange}>
        <ColumnStatesProvider key={key} localStorageKey={cacheKey ? `${cacheKey}${columnStatesSuffix}` : undefined} numColumns={data.header.length} minWidth={minWidth}>
          <CellsNavigationProvider colCount={ariaColCount} rowCount={ariaRowCount} rowPadding={props.padding ?? defaultPadding}>
            <HighTableInner numRows={numRows} {...props} />
          </CellsNavigationProvider>
        </ColumnStatesProvider>
      </SelectionProvider>
    </OrderByProvider>
  )
}

type PropsInner = Omit<PropsData, 'orderBy' | 'onOrderByChange' | 'selection' | 'onSelectionChange'> & {
  numRows: number // number of rows in the data frame
}

/**
 * The main purpose of extracting HighTableInner from HighTable is to
 * separate the context providers from the main component. It will also
 * remove the need to reindent the code if adding a new context provide.
 */
export function HighTableInner({
  overscan = defaultOverscan,
  padding = defaultPadding,
  focus = true,
  onDoubleClickCell,
  onMouseDownCell,
  onKeyDownCell,
  // onError = console.error, // TODO(SL): re-enable later
  stringify = stringifyDefault,
  className = '',
  columnClassNames = [],
  styled = true,
  columnConfiguration,
  numRows,
}: PropsInner) {
  /**
   * The component relies on the model of a virtual table which rows are ordered and only the
   * visible rows are fetched (rows range) and rendered as HTML <tr> elements.
   *
   * We use two reference domains for the rows:
   * - data:          the index of a row in the original (unsorted) data frame is referred as
   *                  dataIndex. It's the `index` field of the AsyncRow objects in the data frame.
   *                  The mouse event callbacks receive this index.
   * - virtual table: the index of a row in the virtual table (sorted) is referred as tableIndex.
   *                  rowsRange.start lives in the table domain: it's the first virtual row to be
   *                  rendered in HTML.
   *
   * The same row can be obtained as:
   * - data.getCell({row: dataIndex, column: 'id'})
   * - data.getCell({row: tableIndex, column: 'id', orderBy})
   */

  const { data } = useData()
  const [rowsRange, setRowsRange] = useState({ start: 0, end: 0 })
  const { enterCellsNavigation, setEnterCellsNavigation, onTableKeyDown: onNavigationTableKeyDown, onScrollKeyDown, rowIndex, colIndex, focusFirstCell } = useCellsNavigation()
  const [lastCellPosition, setLastCellPosition] = useState({ rowIndex, colIndex })
  const { setAvailableWidth } = useColumnStates()

  // TODO(SL): remove this state and only rely on the data frame for these operations?
  // ie. cache the previous sort indexes in the data frame itself
  // const [ranksMap, setRanksMap] = useState<Map<string, Promise<number[]>>>(() => new Map())

  const { orderBy, onOrderByChange } = useOrderBy()
  const { selection, onSelectionChange, toggleAllRows, onTableKeyDown: onSelectionTableKeyDown } = useSelection({ numRows })

  const columns = useTableConfig(data.header, columnConfiguration)
  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event)
    onSelectionTableKeyDown?.(event, numRows)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown, numRows])

  // const pendingSelectionRequest = useRef(0)
  const getOnCheckboxPress = useCallback(({ dataIndex }: {tableIndex: number, dataIndex: number | undefined}) => {
    if (selection && onSelectionChange && dataIndex !== undefined) {
      return (shiftKey: boolean): void => {
        onSelectRowClick(shiftKey, selection, onSelectionChange, dataIndex)
      }
    }

    function onSelectRowClick(shiftKey: boolean, selection: Selection, onSelectionChange: (selection: Selection) => void, dataIndex: number) {
      const useAnchor = shiftKey && selection.anchor !== undefined

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
      throw new Error('Sorting is not implemented yet') // TODO(SL): implement sorting
      // const requestId = ++pendingSelectionRequest.current
      // const newSelection = await toggleRangeInTable({
      //   selection,
      //   tableIndex,
      //   orderBy,
      //   data,
      //   ranksMap,
      //   setRanksMap,
      // })
      // if (requestId === pendingSelectionRequest.current) {
      //   // only update the selection if the request is still the last one
      //   onSelectionChange(newSelection)
      // }
    }
  }, [onSelectionChange, orderBy, selection])
  const allRowsSelected = useMemo(() => {
    if (!selection) return undefined
    return areAllSelected({ ranges: selection.ranges, length: numRows })
  }, [selection, numRows])
  const isRowSelected = useCallback((dataIndex: number | undefined) => {
    if (!selection || dataIndex === undefined) return undefined
    return isSelected({ ranges: selection.ranges, index: dataIndex })
  }, [selection])

  // total scrollable height
  const scrollHeight = (numRows + 1) * rowHeight
  const offsetTop = Math.max(0, rowsRange.start - padding) * rowHeight

  const tableCornerRef = useRef<Pick<HTMLTableCellElement, 'offsetWidth'>>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // scroll vertically to the focused cell if needed
  useEffect(() => {
    // TODO(SL): add a new guard?
    // if (!slice) {
    //   // don't scroll if the slice is not ready
    //   return
    // }
    if (!enterCellsNavigation && lastCellPosition.rowIndex === rowIndex && lastCellPosition.colIndex === colIndex) {
      // don't scroll if the navigation cell is unchanged
      // occurs when the user is scrolling with the mouse for example, and the
      // cell exits the viewport: don't want to scroll back to it
      return
    }
    setEnterCellsNavigation?.(false)
    setLastCellPosition({ rowIndex, colIndex })
    const tableIndex = rowIndex - ariaOffset
    const scroller = scrollRef.current
    if (!scroller) {
      // don't scroll if the scroller is not ready
      return
    }
    let nextScrollTop = scroller.scrollTop
    // if tableIndex outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    if (tableIndex < rowsRange.start || tableIndex >= rowsRange.end) {
      nextScrollTop = tableIndex * rowHeight
    }
    if (nextScrollTop !== scroller.scrollTop) {
      // scroll to the cell
      scroller.scrollTop = nextScrollTop
    }
  }, [rowIndex, colIndex, rowsRange, lastCellPosition, padding, enterCellsNavigation, setEnterCellsNavigation])

  // handle scrolling and window resizing
  useEffect(() => {
    let abortController: AbortController | undefined = undefined

    /**
     * Compute the dimensions based on the current scroll position.
     */
    function handleScroll() {
      // abort the previous fetches if any
      abortController?.abort()
      abortController = new AbortController()
      // view window height (0 is not allowed - the syntax is verbose, but makes it clear)
      const currentClientHeight = scrollRef.current?.clientHeight
      const clientHeight = currentClientHeight === undefined || currentClientHeight === 0 ? 100 : currentClientHeight
      // scroll position
      const scrollTop = scrollRef.current?.scrollTop ?? 0

      // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
      const startView = Math.floor(numRows * scrollTop / scrollHeight)
      const endView = Math.ceil(numRows * (scrollTop + clientHeight) / scrollHeight)
      const start = Math.max(0, startView - overscan)
      const end = Math.min(numRows, endView + overscan)

      if (isNaN(start)) throw new Error(`invalid start row ${start}`)
      if (isNaN(end)) throw new Error(`invalid end row ${end}`)
      if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)

      setRowsRange({ start, end })
      data.fetch?.({
        rowStart: start,
        rowEnd: end,
        columns: data.header,
        orderBy,
        signal: abortController.signal,
      })
    }

    /**
     * Report the scroller width
     */
    function reportWidth() {
      if (scrollRef.current && tableCornerRef.current) {
        // we use the scrollRef client width, because we're interested in the content area
        const tableWidth = getClientWidth(scrollRef.current)
        const leftColumnWidth = getOffsetWidth(tableCornerRef.current)
        setAvailableWidth?.(tableWidth - leftColumnWidth)
      }
    }

    // run once
    handleScroll()
    reportWidth()

    // listeners
    const scroller = scrollRef.current
    scroller?.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', handleScroll)
    window.addEventListener('resize', reportWidth)

    return () => {
      abortController?.abort() // cancel the fetches if any
      scroller?.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      window.removeEventListener('resize', reportWidth)
    }
  }, [numRows, overscan, padding, scrollHeight, setAvailableWidth, data, orderBy])

  // TODO(SL): restore a mechanism to change slice when the number of rows has changed

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
  const getOnKeyDownCell = useCallback((col: number, row?: number) => {
    if (!onKeyDownCell || row === undefined) return
    return (e: KeyboardEvent) => {
      onKeyDownCell(e, col, row)
    }
  }, [onKeyDownCell])

  // focus table on mount, or on data change, so arrow keys work
  useEffect(() => {
    if (focus) {
      // Try focusing the first cell
      focusFirstCell?.()
    }
  }, [data, focus, focusFirstCell])

  // add empty pre and post rows to fill the viewport
  const offset = rowsRange.start
  const rowsLength = rowsRange.end - rowsRange.start
  const prePadding = Array.from({ length: Math.min(padding, offset) }, () => [])
  const tableIndexes = Array.from({ length: rowsLength }, (_, i) => i + offset)
  const postPadding = Array.from({ length: Math.min(padding, numRows - offset - rowsLength) }, () => [])

  // minimum left column width based on number of rows - it depends on CSS, so it's
  // only a bottom limit
  const rowHeaderWidth = useMemo(() => {
    return Math.ceil(Math.log10(numRows + 1)) * 4 + 22
  }, [numRows])
  const cornerStyle = useMemo(() => {
    return cellStyle(rowHeaderWidth)
  }, [rowHeaderWidth])
  const tableScrollStyle = useMemo(() => {
    return {
      '--column-header-height': `${rowHeight}px`,
      '--row-number-width': `${rowHeaderWidth}px`,
    } as CSSProperties
  }, [rowHeaderWidth])
  const restrictedOnScrollKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== scrollRef.current) {
      // don't handle the event if the target is not the scroller
      return
    }
    onScrollKeyDown?.(event)
  }, [onScrollKeyDown])

  // don't render table if header is empty
  if (!columns.length) return

  const ariaColCount = columns.length + 1 // don't forget the selection column
  const ariaRowCount = numRows + 1 // don't forget the header row
  return (
    <div className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`}>
      <div className={styles.topBorder} role="presentation"></div>
      <div className={styles.tableScroll} ref={scrollRef} role="group" aria-labelledby="caption" style={tableScrollStyle} onKeyDown={restrictedOnScrollKeyDown} tabIndex={0}>
        <div style={{ height: `${scrollHeight}px` }}>
          <table
            aria-readonly={true}
            aria-colcount={ariaColCount}
            aria-rowcount={ariaRowCount}
            aria-multiselectable={selection !== undefined}
            role='grid'
            style={{ top: `${offsetTop}px` }}
            onKeyDown={onTableKeyDown}
          >
            <caption id="caption" hidden>Virtual-scroll table</caption>
            <thead role="rowgroup">
              <Row ariaRowIndex={1} >
                <TableCorner
                  onCheckboxPress={toggleAllRows}
                  checked={allRowsSelected}
                  style={cornerStyle}
                  ariaColIndex={1}
                  ariaRowIndex={1}
                  ref={tableCornerRef}
                >&nbsp;</TableCorner>
                <TableHeader
                // TODO(SL): find a better way to check if the data is ready and the column widths should be computed
                  dataReady={rowsLength > 0}
                  header={columns}
                  orderBy={orderBy}
                  onOrderByChange={onOrderByChange}
                  columnClassNames={columnClassNames}
                  ariaRowIndex={1}
                />
              </Row>
            </thead>
            <tbody role="rowgroup">
              {prePadding.map((_, prePaddingIndex) => {
                const tableIndex = offset - prePadding.length + prePaddingIndex
                const ariaRowIndex = tableIndex + ariaOffset
                return (
                  <Row key={tableIndex} ariaRowIndex={ariaRowIndex}>
                    <RowHeader style={cornerStyle} ariaColIndex={1} ariaRowIndex={ariaRowIndex} />
                  </Row>
                )
              })}
              {tableIndexes.map((tableIndex) => {
                const inferredDataIndex = orderBy === undefined || orderBy.length === 0 ? tableIndex : undefined
                // TODO(SL): when sorting is supported, use data.getIndex()
                // const dataIndex = row.index ?? inferredDataIndex
                const dataIndex = inferredDataIndex
                const selected = isRowSelected(dataIndex)
                const ariaRowIndex = tableIndex + ariaOffset
                return (
                  <Row
                    key={tableIndex}
                    selected={selected}
                    ariaRowIndex={ariaRowIndex}
                    // title={rowError(row, columns.length)} // TODO(SL): re-enable later
                  >
                    <RowHeader
                      busy={dataIndex === undefined}
                      style={cornerStyle}
                      onCheckboxPress={getOnCheckboxPress({ tableIndex, dataIndex })}
                      checked={selected}
                      showCheckBox={selection !== undefined}
                      ariaColIndex={1}
                      ariaRowIndex={ariaRowIndex}
                      dataRowIndex={dataIndex}
                    >{formatRowNumber(dataIndex)}</RowHeader>
                    {data.header.map((column, columnIndex) => {
                      return <Cell
                        key={columnIndex}
                        data={data}
                        rowIndex={tableIndex}
                        column={column}
                        orderBy={orderBy}
                        onDoubleClick={getOnDoubleClickCell(columnIndex, dataIndex)}
                        onMouseDown={getOnMouseDownCell(columnIndex, dataIndex)}
                        onKeyDown={getOnKeyDownCell(columnIndex, dataIndex)}
                        stringify={stringify}
                        columnIndex={columnIndex}
                        className={columnClassNames[columnIndex]}
                        ariaColIndex={columnIndex + ariaOffset}
                        ariaRowIndex={ariaRowIndex}
                        dataRowIndex={dataIndex}
                      />
                    })}
                  </Row>
                )
              })}
              {postPadding.map((_, postPaddingIndex) => {
                const tableIndex = offset + rowsLength + postPaddingIndex
                const ariaRowIndex = tableIndex + ariaOffset
                return (
                  <Row key={tableIndex} ariaRowIndex={ariaRowIndex}>
                    <RowHeader style={cornerStyle} ariaColIndex={1} ariaRowIndex={ariaRowIndex} />
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
  )
}
