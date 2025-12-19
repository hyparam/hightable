import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { type ColumnParameters, ColumnParametersContext } from '../../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { SelectionContext } from '../../contexts/SelectionContext.js'
import { ViewportContext } from '../../contexts/ViewportContext.js'
import type { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import type { DataFrame } from '../../helpers/dataframe/index.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import styles from '../../HighTable.module.css'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnVisibilityStatesProvider, type MaybeHiddenColumn } from '../../providers/ColumnVisibilityStatesProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { PortalContainerProvider } from '../../providers/PortalContainerProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import { TableCornerProvider } from '../../providers/TableCornerProvider.js'
import { ViewportProvider } from '../../providers/ViewportProvider.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell, { type CellContentProps } from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'

const rowHeight = 33 // row height px
const defaultPadding = 20
const defaultOverscan = 20
const ariaOffset = 2 // 1-based index, +1 for the header

const columnWidthsFormatVersion = '2' // increase in case of breaking changes in the column widths format
const columnWidthsSuffix = `:${columnWidthsFormatVersion}:column:widths` // suffix used to store the column widths in local storage
const columnVisibilityStatesFormatVersion = '2' // increase in case of breaking changes in the column visibility format (changed from array by index to record by name)
const columnVisibilityStatesSuffix = `:${columnVisibilityStatesFormatVersion}:column:visibility` // suffix used to store the columns vsibility in local storage

export interface HighTableDataProps {
  cacheKey?: string // used to persist column widths. If undefined, the column widths are not persisted. It is expected to be unique for each table.
  className?: string // additional class names for the component
  columnConfiguration?: ColumnConfiguration
  focus?: boolean // focus table on mount? (default true)
  maxRowNumber?: number // maximum row number to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied.
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  styled?: boolean // use styled component? (default true)
  // TODO(SL): replace col: number with col: string?
  onColumnsVisibilityChange?: (columns: Record<string, MaybeHiddenColumn>) => void // callback which is called whenever the set of hidden columns changes.
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onError?: (error: unknown) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  renderCellContent?: (props: CellContentProps) => ReactNode // custom cell content component, if not provided, the default CellContent will be used
  stringify?: (value: unknown) => string | undefined
}

export default function HighTableData(props: HighTableDataProps) {
  const { data, key, version, maxRowNumber, numRows } = useContext(DataContext)
  // TODO(SL): onError could be in a context, as we might want to use it everywhere
  const { cacheKey, orderBy, onOrderByChange, selection, onSelectionChange, onError, onColumnsVisibilityChange } = props

  const columnNames = useMemo(() => data.columnDescriptors.map(d => d.name), [data.columnDescriptors])

  const initialVisibilityStates = useMemo(() => {
    if (!props.columnConfiguration) return undefined
    const states: Record<string, { hidden: true } | undefined> = {}
    for (const descriptor of data.columnDescriptors) {
      const config = props.columnConfiguration[descriptor.name]
      if (config?.initiallyHidden) {
        states[descriptor.name] = { hidden: true as const }
      }
    }
    return states
  }, [props.columnConfiguration, data.columnDescriptors])

  return (
    <PortalContainerProvider>
      <ViewportProvider>
        <TableCornerProvider>
          {/* Provide the column configuration to the table */}
          <ColumnParametersProvider columnConfiguration={props.columnConfiguration} columnDescriptors={data.columnDescriptors}>
            {/* Create a new set of widths if the data has changed, but keep it if only the number of rows changed */}
            <ColumnWidthsProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnWidthsSuffix}` : undefined} numColumns={data.columnDescriptors.length}>
              {/* Create a new set of hidden columns if the data has changed, but keep it if only the number of rows changed */}
              <ColumnVisibilityStatesProvider key={cacheKey ?? key} localStorageKey={cacheKey ? `${cacheKey}${columnVisibilityStatesSuffix}` : undefined} columnNames={columnNames} initialVisibilityStates={initialVisibilityStates} onColumnsVisibilityChange={onColumnsVisibilityChange}>
                {/* Create a new context if the dataframe changes, to flush the cache (ranks and indexes) */}
                <OrderByProvider key={key} orderBy={orderBy} onOrderByChange={onOrderByChange}>
                  {/* Create a new selection context if the dataframe has changed */}
                  <SelectionProvider key={key} selection={selection} onSelectionChange={onSelectionChange} data={data} numRows={numRows} onError={onError}>
                    {/* Create a new navigation context if the dataframe has changed, because the focused cell might not exist anymore */}
                    <CellNavigationProvider key={key}>
                      <ScrollContainer data={data} numRows={numRows} version={version} {...props} maxRowNumber={maxRowNumber} />
                    </CellNavigationProvider>
                  </SelectionProvider>
                </OrderByProvider>
              </ColumnVisibilityStatesProvider>
            </ColumnWidthsProvider>
          </ColumnParametersProvider>
        </TableCornerProvider>
      </ViewportProvider>
    </PortalContainerProvider>
  )
}

type ScrollContainerProps = Omit<HighTableDataProps, 'orderBy' | 'onOrderByChange' | 'selection' | 'onSelectionChange' | 'columnConfiguration' | 'maxRowNumber'> & {
  version: number // version of the data frame, used to re-render the component when the data changes
  maxRowNumber: number // maximum row number to display (for row headers).
  numRows: number // number of rows in the data frame
  data: Omit<DataFrame, 'numRows'> // data frame without numRows (provided separately)
}

type TableSliceProps = Omit<ScrollContainerProps, 'maxRowNumber' | 'styled' | 'className' | 'overscan' | 'onerror'> & {
  tableOffset: number // offset top to apply to the table
  rowsRange: RowsRange // range of rows to render
  columnsParameters: ColumnParameters[] // parameters of the columns to render
}

interface RowsRange {
  start: number // start index of the rows range (inclusive)
  end: number // end index of the rows range (exclusive)
}

/**
 * Container providing the scrollable area for the table.
 */
function ScrollContainer({
  data,
  numRows,
  overscan = defaultOverscan,
  padding = defaultPadding,
  focus = true,
  onDoubleClickCell,
  onMouseDownCell,
  onKeyDownCell,
  onError = console.error,
  stringify = stringifyDefault,
  className = '',
  styled = true,
  version,
  renderCellContent,
  maxRowNumber,
}: ScrollContainerProps) {
  const { containerRef } = useContext(PortalContainerContext)
  const { shouldScroll, setShouldScroll, onScrollKeyDown, cellPosition } = useContext(CellNavigationContext)
  const { orderBy } = useContext(OrderByContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)
  const { viewportRef: scrollRef, viewportHeight } = useContext(ViewportContext)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  // local state
  const [rowsRange, setRowsRange] = useState<RowsRange>({ start: 0, end: 0 })

  // total scrollable height
  /* TODO: fix the computation on unstyled tables */
  const scrollHeight = (numRows + 1) * rowHeight
  const tableOffset = Math.max(0, rowsRange.start - padding) * rowHeight

  const tableScrollStyle = useMemo(() => {
    // reserve space for at least 3 characters
    const numCharacters = Math.max(maxRowNumber.toLocaleString('en-US').length, 3)
    return {
      '--column-header-height': `${rowHeight}px`,
      '--row-number-characters': `${numCharacters}`,
    } as CSSProperties
  }, [maxRowNumber])

  // scroll if the navigation cell changed, or if entering navigation mode
  // this excludes the case where the whole table is focused (not in cell navigation mode), the user
  // is scrolling with the mouse or the arrow keys, and the cell exits the viewport: don't want to scroll
  // back to it
  useEffect(() => {
    const scroller = scrollRef.current
    if (!shouldScroll || !scroller || !('scrollTo' in scroller)) {
      // scrollTo does not exist in jsdom, used in the tests
      return
    }
    setShouldScroll?.(false)
    const row = cellPosition.rowIndex - ariaOffset
    let nextScrollTop = scroller.scrollTop
    // if row outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    if (row < rowsRange.start || row >= rowsRange.end) {
      nextScrollTop = row * rowHeight
    }
    if (nextScrollTop !== scroller.scrollTop) {
      // scroll to the cell
      scroller.scrollTo({ top: nextScrollTop, behavior: 'auto' })
    }
  }, [cellPosition, shouldScroll, rowsRange, setShouldScroll, scrollRef])

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
      const clientHeight = viewportHeight === undefined || viewportHeight === 0 ? 100 : viewportHeight
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

    // run once
    handleScroll()

    // listeners
    const scroller = scrollRef.current

    if (scroller) {
      scroller.addEventListener('scroll', handleScroll)
    }

    return () => {
      abortController?.abort() // cancel the fetches if any
      if (scroller) {
        scroller.removeEventListener('scroll', handleScroll)
      }
    }
  }, [numRows, overscan, padding, scrollHeight, data, orderBy, onError, columnsParameters, scrollRef, viewportHeight])

  const restrictedOnScrollKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== scrollRef.current) {
      // don't handle the event if the target is not the scroller
      return
    }
    onScrollKeyDown?.(event)
  }, [onScrollKeyDown, scrollRef])

  return (
    <div ref={containerRef} className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`} style={tableScrollStyle}>
      <div className={styles.topBorder} role="presentation" />
      <div className={styles.tableScroll} ref={scrollRef} role="group" aria-labelledby="caption" onKeyDown={restrictedOnScrollKeyDown} tabIndex={0}>
        <div style={{ height: `${scrollHeight}px` }}>
          <TableSlice
            data={data}
            numRows={numRows}
            padding={padding}
            focus={focus}
            onDoubleClickCell={onDoubleClickCell}
            onMouseDownCell={onMouseDownCell}
            onKeyDownCell={onKeyDownCell}
            stringify={stringify}
            version={version}
            renderCellContent={renderCellContent}
            tableOffset={tableOffset}
            rowsRange={rowsRange}
            columnsParameters={columnsParameters}
          />
        </div>
      </div>
      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>
    </div>
  )
}

/**
 * Only the visible rows are fetched and rendered as HTML <tr> elements.
 */
function TableSlice({
  data,
  numRows,
  padding = defaultPadding,
  focus = true,
  onDoubleClickCell,
  onMouseDownCell,
  onKeyDownCell,
  stringify = stringifyDefault,
  version,
  renderCellContent,
  tableOffset,
  rowsRange,
  columnsParameters,
}: TableSliceProps) {
  // contexts
  const { onTableKeyDown: onNavigationTableKeyDown, focusFirstCell } = useContext(CellNavigationContext)
  const { orderBy, onOrderByChange } = useContext(OrderByContext)
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useContext(SelectionContext)

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event, { numRowsPerPage: rowsRange.end - rowsRange.start })
    onSelectionTableKeyDown?.(event)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown, rowsRange])

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

  // Prepare the slice of data to render
  // TODO(SL): also compute progress percentage here, to show a loading indicator
  const slice = useMemo(() => {
    const canMeasureColumn: Record<string, boolean> = {}
    const rowContents = rows.map((row) => {
      const rowNumber = data.getRowNumber({ row, orderBy })?.value
      const cells = columnsParameters.map(({ name: column, index: originalColumnIndex }) => {
        const cell = data.getCell({ row, column, orderBy })
        canMeasureColumn[column] ||= cell !== undefined
        return { columnIndex: originalColumnIndex, cell }
      })
      return {
        row,
        rowNumber,
        cells,
      }
    })
    return {
      rowContents,
      canMeasureColumn,
      version,
    }
  }, [data, columnsParameters, rows, orderBy, version])

  // don't render table if header is empty
  if (!columnsParameters.length) return

  const ariaColCount = columnsParameters.length + 1 // don't forget the selection column
  const ariaRowCount = numRows + 1 // don't forget the header row
  return (
    <table
      aria-readonly={true}
      aria-colcount={ariaColCount}
      aria-rowcount={ariaRowCount}
      aria-multiselectable={selectable}
      aria-busy={pendingSelectionGesture /* TODO(SL): add other busy states? Used only for tests right now */}
      role="grid"
      style={{ top: `${tableOffset}px` }}
      onKeyDown={onTableKeyDown}
    >
      <caption id="caption" hidden>Virtual-scroll table</caption>
      <thead role="rowgroup">
        <Row ariaRowIndex={1}>
          <TableCorner
            onCheckboxPress={toggleAllRows}
            checked={allRowsSelected}
            pendingSelectionGesture={pendingSelectionGesture}
            ariaColIndex={1}
            ariaRowIndex={1}
          />
          <TableHeader
            canMeasureColumn={slice.canMeasureColumn}
            columnsParameters={columnsParameters}
            orderBy={orderBy}
            onOrderByChange={onOrderByChange}
            ariaRowIndex={1}
            exclusiveSort={data.exclusiveSort === true}
          />
        </Row>
      </thead>
      <tbody role="rowgroup">
        {prePadding.map((_, prePaddingIndex) => {
          const row = offset - prePadding.length + prePaddingIndex
          const ariaRowIndex = row + ariaOffset
          return (
            <Row key={row} ariaRowIndex={ariaRowIndex}>
              <RowHeader ariaColIndex={1} ariaRowIndex={ariaRowIndex} />
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
                selected={selected}
                rowNumber={rowNumber}
                onCheckboxPress={getOnCheckboxPress({ rowNumber, row })}
                pendingSelectionGesture={pendingSelectionGesture}
                ariaColIndex={1}
                ariaRowIndex={ariaRowIndex}
              />
              {cells.map(({ columnIndex, cell }, visibleColumnIndex) => {
                const columnClassName = columnsParameters[visibleColumnIndex]?.className
                return (
                  <Cell
                    key={columnIndex}
                    onDoubleClickCell={onDoubleClickCell}
                    onMouseDownCell={onMouseDownCell}
                    onKeyDownCell={onKeyDownCell}
                    stringify={stringify}
                    columnIndex={columnIndex}
                    visibleColumnIndex={visibleColumnIndex}
                    className={columnClassName}
                    ariaColIndex={visibleColumnIndex + ariaOffset}
                    ariaRowIndex={ariaRowIndex}
                    cell={cell}
                    rowNumber={rowNumber}
                    renderCellContent={renderCellContent}
                  />
                )
              })}
            </Row>
          )
        })}
        {postPadding.map((_, postPaddingIndex) => {
          const row = offset + rowsLength + postPaddingIndex
          const ariaRowIndex = row + ariaOffset
          return (
            <Row key={row} ariaRowIndex={ariaRowIndex}>
              <RowHeader ariaColIndex={1} ariaRowIndex={ariaRowIndex} />
            </Row>
          )
        })}
      </tbody>
    </table>
  )
}
