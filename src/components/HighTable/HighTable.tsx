import { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import { DataFrame } from '../../helpers/dataframe/index.js'
import { Selection } from '../../helpers/selection.js'
import { OrderBy } from '../../helpers/sort.js'
import { cellStyle, getClientWidth, getOffsetWidth } from '../../helpers/width.js'
import { CellsNavigationProvider, useCellsNavigation } from '../../hooks/useCellsNavigation.js'
import { ColumnParametersProvider, useColumnParameters } from '../../hooks/useColumnParameters.js'
import { ColumnWidthsProvider, useColumnWidths } from '../../hooks/useColumnWidths.js'
import { ColumnVisibilityStatesProvider, type MaybeHiddenColumn, useColumnVisibilityStates } from '../../hooks/useColumnVisibilityStates.js'
import { DataProvider, useData } from '../../hooks/useData.js'
import { OrderByProvider, useOrderBy } from '../../hooks/useOrderBy.js'
import { PortalContainerProvider, usePortalContainer } from '../../hooks/usePortalContainer.js'
import { SelectionProvider, useSelection } from '../../hooks/useSelection.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell, { type CellContentProps } from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
import styles from '../../HighTable.module.css'
export { type CellContentProps } from '../Cell/Cell.js'

const rowHeight = 33 // row height px

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
  onColumnsVisibilityChange?: (columns: MaybeHiddenColumn[]) => void // callback which is called whenever the set of hidden columns changes.
  stringify?: (value: unknown) => string | undefined
  className?: string // additional class names for the component
  columnClassNames?: (string | undefined)[] // list of additional class names for the header and cells of each column. The index in this array corresponds to the column index in columns
  styled?: boolean // use styled component? (default true)
  renderCellContent?: (props: CellContentProps) => ReactNode // custom cell content component, if not provided, the default CellContent will be used
}

const defaultPadding = 20
export const defaultOverscan = 20
const ariaOffset = 2 // 1-based index, +1 for the header

const columnWidthsFormatVersion = '2' // increase in case of breaking changes in the column widths format
export const columnWidthsSuffix = `:${columnWidthsFormatVersion}:column:widths` // suffix used to store the column widths in local storage
const columnVisibilityStatesFormatVersion = '1' // increase in case of breaking changes in the column widths format
export const columnVisibilityStatesSuffix = `:${columnVisibilityStatesFormatVersion}:column:visibility` // suffix used to store the columns vsibility in local storage

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
  // TODO(SL): onError could be in a context, as we might want to use it everywhere
  const { cacheKey, orderBy, onOrderByChange, selection, onSelectionChange, onError, onColumnsVisibilityChange } = props

  return (
    /* Provide the column configuration to the table */
    <ColumnParametersProvider columnConfiguration={props.columnConfiguration} data={data}>
      {/* Create a new set of widths if the data has changed, but keep it if only the number of rows changed */}
      <ColumnWidthsProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined} numColumns={data.columnDescriptors.length}>
        {/* Create a new set of hidden columns if the data has changed, but keep it if only the number of rows changed */}
        <ColumnVisibilityStatesProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnVisibilityStatesSuffix}` : undefined} numColumns={data.columnDescriptors.length} onColumnsVisibilityChange={onColumnsVisibilityChange}>
          {/* Create a new context if the dataframe changes, to flush the cache (ranks and indexes) */}
          <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange}>
            {/* Create a new selection context if the dataframe has changed */}
            <SelectionProvider key={key} selection={selection} onSelectionChange={onSelectionChange} data={data} onError={onError}>
              {/* Create a new navigation context if the dataframe has changed, because the focused cell might not exist anymore */}
              <CellsNavigationProvider key={key} colCount={data.columnDescriptors.length + 1} rowCount={numRows + 1} rowPadding={props.padding ?? defaultPadding}>
                <PortalContainerProvider>
                  <HighTableInner version={version} {...props} />
                </PortalContainerProvider>
              </CellsNavigationProvider>
            </SelectionProvider>
          </OrderByProvider>
        </ColumnVisibilityStatesProvider>
      </ColumnWidthsProvider>
    </ColumnParametersProvider>
  )
}

type PropsInner = Omit<PropsData, 'orderBy' | 'onOrderByChange' | 'selection' | 'onSelectionChange' | 'columnConfiguration'> & {
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
  version,
  renderCellContent,
}: PropsInner) {
  // contexts
  const { data } = useData()
  const { numRows } = data
  const { enterCellsNavigation, setEnterCellsNavigation, onTableKeyDown: onNavigationTableKeyDown, onScrollKeyDown, cellPosition, focusFirstCell } = useCellsNavigation()
  const { containerRef } = usePortalContainer()
  const { setAvailableWidth } = useColumnWidths()
  const { isHiddenColumn } = useColumnVisibilityStates()
  const { orderBy, onOrderByChange } = useOrderBy()
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useSelection()
  const allColumnsParameters = useColumnParameters()
  // local state
  const [rowsRange, setRowsRange] = useState<RowsRange>({ start: 0, end: 0 })
  const [lastCellPosition, setLastCellPosition] = useState(cellPosition)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((_, index) => {
      return !isHiddenColumn?.(index)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event)
    onSelectionTableKeyDown?.(event)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown])

  const getOnCheckboxPress = useCallback(({ row, rowNumber }: { row: number, rowNumber?: number }) => {
    if (rowNumber === undefined || !toggleRowNumber || !toggleRangeToRowNumber) {
      return undefined
    }
    return ({ shiftKey }: { shiftKey: boolean }) => {
      if (shiftKey) {
        toggleRangeToRowNumber({ row, rowNumber })
      } else {
        toggleRowNumber({ rowNumber })
      }
    }
  }, [toggleRowNumber, toggleRangeToRowNumber])

  // total scrollable height
  /* TODO: fix the computation on unstyled tables */
  const scrollHeight = (numRows + 1) * rowHeight
  const offsetTop = Math.max(0, rowsRange.start - padding) * rowHeight

  const tableCornerRef = useRef<Pick<HTMLTableCellElement, 'offsetWidth'> | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // scroll vertically to the focused cell if needed
  useEffect(() => {
    if (!enterCellsNavigation && lastCellPosition.rowIndex === cellPosition.rowIndex && lastCellPosition.colIndex === cellPosition.colIndex) {
    // scroll if the navigation cell changed, or if entering navigation mode
    // this excludes the case where the whole table is focused (not in cell navigation mode), the user
    // is scrolling with the mouse or the arrow keys, and the cell exits the viewport: don't want to scroll
    // back to it
      return
    }
    setEnterCellsNavigation?.(false)
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      // scroller.scrollTo({ top: nextScrollTop, behavior: 'auto' })
    }
  }, [cellPosition, enterCellsNavigation, rowsRange, setEnterCellsNavigation, lastCellPosition])

  // handle scrolling and component resizing
  useEffect(() => {
    let abortController: AbortController | undefined = undefined

    /**
     * Compute the dimensions based on the current scroll position.
     */
    function handleScroll() {
      // abort the previous fetches if any
      abortController?.abort()
      abortController = new AbortController()
      // view height (0 is not allowed - the syntax is verbose, but makes it clear)
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
      if (data.fetch) {
        data.fetch({
          rowStart: start,
          rowEnd: end,
          columns: columnsParameters.map(({ name }) => name),
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

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const resizeObserver = window.ResizeObserver && new window.ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === scrollRef.current) {
          handleScroll()
          reportWidth()
        }
      }
    })

    // run once
    handleScroll()
    reportWidth()

    // listeners
    const scroller = scrollRef.current

    if (scroller) {
      scroller.addEventListener('scroll', handleScroll)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      resizeObserver?.observe(scroller)
    }

    return () => {
      abortController?.abort() // cancel the fetches if any
      if (scroller) {
        scroller.removeEventListener('scroll', handleScroll)
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        resizeObserver?.unobserve(scroller)
      }
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      resizeObserver?.disconnect()
    }
  }, [numRows, overscan, padding, scrollHeight, setAvailableWidth, data, orderBy, onError, columnsParameters])

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
  // TODO(SL): also compute progress percentage here, to show a loading indicator
  const slice = useMemo(() => {
    let hasCompleteRow = false
    const rowContents = rows.map((row) => {
      const rowNumber = data.getRowNumber({ row, orderBy })?.value
      const cells = columnsParameters.map(({ name: column }, columnIndex) => {
        const cell = data.getCell({ row, column, orderBy })
        return { columnIndex, cell }
      })
      if (cells.every(({ cell }) => cell !== undefined)) {
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
      version,
    }
  }, [data, columnsParameters, rows, orderBy, version])

  // don't render table if header is empty
  if (!columnsParameters.length) return

  const ariaColCount = columnsParameters.length + 1 // don't forget the selection column
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
            aria-multiselectable={selectable}
            aria-busy={pendingSelectionGesture /* TODO(SL): add other busy states? Used only for tests right now */}
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
                  pendingSelectionGesture={pendingSelectionGesture}
                  style={cornerStyle}
                  ariaColIndex={1}
                  ariaRowIndex={1}
                  ref={tableCornerRef}
                />
                <TableHeader
                  canMeasureWidth={slice.hasCompleteRow}
                  columnsParameters={columnsParameters}
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
                const selected = isRowSelected?.({ rowNumber })
                const rowKey = `${row}`
                return (
                  <Row
                    key={rowKey}
                    ariaRowIndex={ariaRowIndex}
                    selected={selected}
                    rowNumber={rowNumber}
                    // title={rowError(row, columns.length)} // TODO(SL): re-enable later?
                  >
                    <RowHeader
                      style={cornerStyle}
                      selected={selected}
                      rowNumber={rowNumber}
                      onCheckboxPress={getOnCheckboxPress({ rowNumber, row })}
                      pendingSelectionGesture={pendingSelectionGesture}
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
                        renderCellContent={renderCellContent}
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
