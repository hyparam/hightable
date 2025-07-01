import { CSSProperties, KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import { DataFrame } from '../../helpers/dataframe/index.js'
import { Selection, toggleIndexInSelection, toggleRangeInSelection, toggleRangeInSortedSelection } from '../../helpers/selection.js'
import { OrderBy, serializeOrderBy } from '../../helpers/sort.js'
import { cellStyle, getClientWidth, getOffsetWidth } from '../../helpers/width.js'
import { CellsNavigationProvider, useCellsNavigation } from '../../hooks/useCellsNavigation.js'
import { ColumnStatesProvider, useColumnStates } from '../../hooks/useColumnStates.js'
import { DataProvider, useData } from '../../hooks/useData.js'
import { OrderByProvider, useOrderBy } from '../../hooks/useOrderBy.js'
import { PortalContainerProvider, usePortalContainer } from '../../hooks/usePortalContainer.js'
import { SelectionProvider, useSelection } from '../../hooks/useSelection.js'
import { useTableConfig } from '../../hooks/useTableConfig.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
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
  // TODO(SL): replace col: number with col: string?
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  onError?: (error: unknown) => void
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
    <DataProvider data={props.data}>
      <HighTableData {...props} />
    </DataProvider>
  )
}

type PropsData = Omit<Props, 'data'>

function HighTableData(props: PropsData) {
  const { data, key, version } = useData()
  const { numRows } = data
  const { cacheKey, orderBy, onOrderByChange, selection, onSelectionChange } = props

  return (
    /* Create a new set of widths if the data has changed, but keep it if only the number of rows changed */
    <ColumnStatesProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnStatesSuffix}` : undefined} numColumns={data.header.length} minWidth={minWidth}>
      {/* Create a new context if the dataframe changes, to flush the cache (ranks and indexes) */}
      <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange} disabled={!('sortable' in data && data.sortable)}>
        {/* Create a new selection context if the dataframe has changed */}
        <SelectionProvider key={key} selection={selection} onSelectionChange={onSelectionChange} numRows={numRows}>
          {/* Create a new navigation context if the dataframe has changed, because the focused cell might not exist anymore */}
          <CellsNavigationProvider key={key} colCount={data.header.length + 1} rowCount={numRows + 1} rowPadding={props.padding ?? defaultPadding}>
            <PortalContainerProvider>
              <HighTableInner version={version} {...props} />
            </PortalContainerProvider>
          </CellsNavigationProvider>
        </SelectionProvider>
      </OrderByProvider>
    </ColumnStatesProvider>
  )
}

type PropsInner = Omit<PropsData, 'orderBy' | 'onOrderByChange' | 'selection' | 'onSelectionChange'> & {
  version: number // version of the data frame, used to re-render the component when the data changes
}

interface RowsRange {
  start: number // start index of the rows range (inclusive)
  end: number // end index of the rows range (exclusive)
}

/**
 * The component is a virtual table: only the visible rows are fetched and rendered as HTML <tr> elements.
 *
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
  onError = console.error,
  stringify = stringifyDefault,
  className = '',
  columnClassNames = [],
  styled = true,
  columnConfiguration,
  version,
}: PropsInner) {
  // contexts
  const { data } = useData()
  const { numRows } = data
  const { enterCellsNavigation, setEnterCellsNavigation, onTableKeyDown: onNavigationTableKeyDown, onScrollKeyDown, cellPosition, focusFirstCell } = useCellsNavigation()
  const { containerRef } = usePortalContainer()
  const { setAvailableWidth } = useColumnStates()
  const { orderBy, onOrderByChange, ranksByColumn, indexesByOrderBy } = useOrderBy()
  const { selection, onSelectionChange, toggleAllRows, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected } = useSelection()
  const columns = useTableConfig(data, columnConfiguration)
  // local state
  const [rowsRange, setRowsRange] = useState<RowsRange>({ start: 0, end: 0 })
  const [lastCellPosition, setLastCellPosition] = useState(cellPosition)

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event)
    onSelectionTableKeyDown?.(event)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown])

  const pendingSelectionRequest = useRef(0)
  const getOnCheckboxPress = useCallback(({ row, rowNumber }: { row: number, rowNumber?: number }) => {
    if (!selection || !onSelectionChange || rowNumber === undefined) {
      return undefined
    }
    return async ({ shiftKey }: { shiftKey: boolean }) => {
      const useAnchor = shiftKey && selection.anchor !== undefined
      if (!useAnchor) {
        // single row toggle
        onSelectionChange(toggleIndexInSelection({ selection, index: rowNumber }))
        return
      }

      if (!orderBy || orderBy.length === 0) {
        // no sorting, toggle the range
        onSelectionChange(toggleRangeInSelection({ selection, index: rowNumber }))
        return
      }

      if (!('sortable' in data)) {
        throw new Error('DataFrame is not sortable, cannot toggle range in sorted selection')
        // not SortableDataFrame at this point
      }

      // sorting, toggle the range in the sorted order
      // TODO(SL): show a status message while the request is pending?
      // TODO(SL): remove ranksByColumn and indexesByOrderBy, and make it native to dataframev2?
      const requestId = ++pendingSelectionRequest.current
      const newSelection = await toggleRangeInSortedSelection({
        selection,
        index: row,
        orderBy,
        dataFrame: data,
        ranksByColumn,
        setRanks: ({ column, ranks }) => {
          ranksByColumn?.set(column, ranks)
        },
        indexes: indexesByOrderBy?.get(serializeOrderBy(orderBy)),
        setIndexes: ({ orderBy, indexes }) => {
          indexesByOrderBy?.set(serializeOrderBy(orderBy), indexes)
        },
      })
      if (requestId === pendingSelectionRequest.current) {
        // only update the selection if the request is still the last one
        onSelectionChange(newSelection)
      }
    }
  }, [onSelectionChange, orderBy, selection, data, ranksByColumn, indexesByOrderBy])

  // total scrollable height
  /* TODO: fix the computation on unstyled tables */
  const scrollHeight = (numRows + 1) * rowHeight
  const offsetTop = Math.max(0, rowsRange.start - padding) * rowHeight

  const tableCornerRef = useRef<Pick<HTMLTableCellElement, 'offsetWidth'>>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // scroll vertically to the focused cell if needed
  useEffect(() => {
    if (!enterCellsNavigation && lastCellPosition.rowIndex === cellPosition.rowIndex && lastCellPosition.colIndex === cellPosition.colIndex) {
      // don't scroll if the navigation cell is unchanged
      // occurs when the user is scrolling with the mouse for example, and the
      // cell exits the viewport: don't want to scroll back to it
      return
    }
    setEnterCellsNavigation?.(false)
    setLastCellPosition(cellPosition)
    const row = cellPosition.rowIndex - ariaOffset
    const scroller = scrollRef.current
    if (!scroller) {
      // don't scroll if the scroller is not ready
      return
    }
    let nextScrollTop = scroller.scrollTop
    // if row outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    if (row < rowsRange.start || row >= rowsRange.end) {
      nextScrollTop = row * rowHeight
    }
    if (nextScrollTop !== scroller.scrollTop) {
      // scroll to the cell
      scroller.scrollTop = nextScrollTop
    }
  }, [cellPosition, rowsRange, lastCellPosition, padding, enterCellsNavigation, setEnterCellsNavigation])

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
      data.fetch({
        rowStart: start,
        rowEnd: end,
        columns: data.header,
        orderBy,
        signal: abortController.signal,
      }).catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // fetch was aborted, ignore the error
          return
        }
        onError(error) // report the error to the parent component
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
  }, [numRows, overscan, padding, scrollHeight, setAvailableWidth, data, orderBy, onError])

  // focus table on mount, or on later changes, so arrow keys work
  // Note that the dependency upon data and nowRows was removed, because focusFirstCell should depend on them
  useEffect(() => {
    if (focus) {
      // Try focusing the first cell
      focusFirstCell?.()
    }
  }, [focus, focusFirstCell])

  // add empty pre and post rows to fill the viewport
  const offset = rowsRange.start
  const rowsLength = rowsRange.end - rowsRange.start
  const prePadding = Array.from({ length: Math.min(padding, offset) }, () => [])
  const rows = Array.from({ length: rowsLength }, (_, i) => i + offset)
  const postPadding = Array.from({ length: Math.min(padding, numRows - offset - rowsLength) }, () => [])

  // minimum left column width based on number of rows - it depends on CSS, so it's
  // only a bottom limit
  const rowHeaderWidth = useMemo(() => {
    if (numRows > 0) {
      return Math.ceil(Math.log10(numRows + 1)) * 4 + 22
    }
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

  // Prepare the slice of data to render
  const slice = useMemo(() => {
    let hasCompleteRow = false
    const rowContents = rows.map((row) => {
      const rowNumber = data.getRowNumber({ row, orderBy })?.value
      const cells = data.header.map((column, columnIndex) => {
        const cell = data.getCell({ row, column, orderBy })
        return { columnIndex, cell }
      })
      if (cells.every(({ cell }) => cell?.value !== undefined)) {
        hasCompleteRow = true
      }
      return {
        row,
        rowNumber,
        cells,
      }
    })
    return {
      rowContents,
      hasCompleteRow,
    }
  }, [data, rows, orderBy])

  // don't render table if header is empty
  if (!columns.length) return

  const ariaColCount = columns.length + 1 // don't forget the selection column
  const ariaRowCount = numRows + 1 // don't forget the header row
  return (
    <div ref={containerRef} className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`}>
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
                />
                <TableHeader
                  canMeasureWidth={slice.hasCompleteRow}
                  columnDescriptors={columns}
                  orderBy={orderBy}
                  onOrderByChange={onOrderByChange}
                  columnClassNames={columnClassNames}
                  ariaRowIndex={1}
                />
              </Row>
            </thead>
            <tbody role="rowgroup">
              {prePadding.map((_, prePaddingIndex) => {
                const row = offset - prePadding.length + prePaddingIndex
                const ariaRowIndex = row + ariaOffset
                return (
                  <Row key={row} ariaRowIndex={ariaRowIndex}>
                    <RowHeader style={cornerStyle} ariaColIndex={1} ariaRowIndex={ariaRowIndex} />
                  </Row>
                )
              })}
              {slice.rowContents.map(({ row, rowNumber, cells }) => {
                const ariaRowIndex = row + ariaOffset
                const selected = isRowSelected?.(rowNumber)
                // The row key includes the version, to rerender the row again when the data changes (e.g. when the user scrolls, or when the data has been fetched)
                const rowKey = `${version}-${row}`
                return (
                  <Row
                    key={rowKey}
                    ariaRowIndex={ariaRowIndex}
                    selected={selected}
                    // title={rowError(row, columns.length)} // TODO(SL): re-enable later?
                  >
                    <RowHeader
                      style={cornerStyle}
                      selected={selected}
                      rowNumber={rowNumber}
                      onCheckboxPress={getOnCheckboxPress({ rowNumber, row })}
                      ariaColIndex={1}
                      ariaRowIndex={ariaRowIndex}
                    />
                    {cells.map(({ columnIndex, cell }) => {
                      return <Cell
                        key={columnIndex}
                        onDoubleClickCell={onDoubleClickCell}
                        onMouseDownCell={onMouseDownCell}
                        onKeyDownCell={onKeyDownCell}
                        stringify={stringify}
                        columnIndex={columnIndex}
                        className={columnClassNames[columnIndex]}
                        ariaColIndex={columnIndex + ariaOffset}
                        ariaRowIndex={ariaRowIndex}
                        cell={cell}
                        rowNumber={rowNumber}
                      />
                    })}
                  </Row>
                )
              })}
              {postPadding.map((_, postPaddingIndex) => {
                const row = offset + rowsLength + postPaddingIndex
                const ariaRowIndex = row + ariaOffset
                return (
                  <Row key={row} ariaRowIndex={ariaRowIndex}>
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
