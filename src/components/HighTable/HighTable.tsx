import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { CanvasSizeContext } from '../../contexts/CanvasSizeContext.js'
import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { type ColumnParameters, ColumnParametersContext } from '../../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { RowsSliceContext } from '../../contexts/RowsSliceContext.js'
import { SelectionContext } from '../../contexts/SelectionContext.js'
import { ViewportContext } from '../../contexts/ViewportContext.js'
import type { ColumnConfiguration } from '../../helpers/columnConfiguration.js'
import type { DataFrame } from '../../helpers/dataframe/index.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import styles from '../../HighTable.module.css'
import { CanvasSizeProvider } from '../../providers/CanvasSizeProvider.js'
import { CellNavigationProvider } from '../../providers/CellNavigationProvider.js'
import { ColumnParametersProvider } from '../../providers/ColumnParametersProvider.js'
import { ColumnVisibilityStatesProvider, type MaybeHiddenColumn } from '../../providers/ColumnVisibilityStatesProvider.js'
import { ColumnWidthsProvider } from '../../providers/ColumnWidthsProvider.js'
import { DataProvider } from '../../providers/DataProvider.js'
import { OrderByProvider } from '../../providers/OrderByProvider.js'
import { PortalContainerProvider } from '../../providers/PortalContainerProvider.js'
import { RowsSliceProvider } from '../../providers/RowsSliceProvider.js'
import { SelectionProvider } from '../../providers/SelectionProvider.js'
import { TableCornerProvider } from '../../providers/TableCornerProvider.js'
import { ViewportProvider } from '../../providers/ViewportProvider.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell, { type CellContentProps } from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'

// Ensure these sizes are respected in the CSS. For now: we fix them to 33px
const rowHeight = 33 // row height px
const headerHeight = rowHeight // header height px

interface Props {
  data: DataFrame
  cacheKey?: string // used to persist column widths. If undefined, the column widths are not persisted. It is expected to be unique for each table.
  className?: string // additional class names for the component
  columnConfiguration?: ColumnConfiguration
  focus?: boolean // focus table on mount? (default true)
  maxRowNumber?: number // maximum row number to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied.
  orderBy?: OrderBy // order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order.
  padding?: number // number of padding rows to fetch and render outside of the viewport
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

const defaultPadding = 20
const ariaOffset = 2 // 1-based index, +1 for the header

const columnWidthsFormatVersion = '2' // increase in case of breaking changes in the column widths format
const columnWidthsSuffix = `:${columnWidthsFormatVersion}:column:widths` // suffix used to store the column widths in local storage
const columnVisibilityStatesFormatVersion = '2' // increase in case of breaking changes in the column visibility format (changed from array by index to record by name)
const columnVisibilityStatesSuffix = `:${columnVisibilityStatesFormatVersion}:column:visibility` // suffix used to store the columns vsibility in local storage

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
    <DataProvider data={props.data} maxRowNumber={props.maxRowNumber}>
      <HighTableData {...props} />
    </DataProvider>
  )
}

type PropsData = Omit<Props, 'data'>

function HighTableData(props: PropsData) {
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
        <CanvasSizeProvider numRows={numRows} headerHeight={headerHeight} rowHeight={rowHeight}>
          <TableCornerProvider>
            <RowsSliceProvider numRows={numRows} headerHeight={headerHeight} rowHeight={rowHeight} padding={props.padding ?? defaultPadding}>
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
                        <CellNavigationProvider key={key} colCount={data.columnDescriptors.length + 1} rowCount={numRows + 1} rowPadding={props.padding ?? defaultPadding}>
                          <ScrollContainer data={data} numRows={numRows} version={version} {...props} maxRowNumber={maxRowNumber} />
                        </CellNavigationProvider>
                      </SelectionProvider>
                    </OrderByProvider>
                  </ColumnVisibilityStatesProvider>
                </ColumnWidthsProvider>
              </ColumnParametersProvider>
            </RowsSliceProvider>
          </TableCornerProvider>
        </CanvasSizeProvider>
      </ViewportProvider>
    </PortalContainerProvider>
  )
}

type ScrollContainerProps = Omit<PropsData, 'padding' | 'orderBy' | 'onOrderByChange' | 'selection' | 'onSelectionChange' | 'columnConfiguration' | 'maxRowNumber'> & {
  version: number // version of the data frame, used to re-render the component when the data changes
  maxRowNumber: number // maximum row number to display (for row headers).
  numRows: number // number of rows in the data frame
  data: Omit<DataFrame, 'numRows'> // data frame without numRows (provided separately)
}

/**
 * Container providing the scrollable area for the table.
 */
function ScrollContainer({
  data,
  numRows,
  focus = true,
  onDoubleClickCell,
  onMouseDownCell,
  onKeyDownCell,
  onError,
  stringify = stringifyDefault,
  className = '',
  styled = true,
  version,
  renderCellContent,
  maxRowNumber,
}: ScrollContainerProps) {
  const { containerRef } = useContext(PortalContainerContext)
  const { onScrollKeyDown } = useContext(CellNavigationContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)
  const { viewportRef } = useContext(ViewportContext)
  const { canvasHeight } = useContext(CanvasSizeContext)

  const canvasRef = useRef<HTMLDivElement | null>(null)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  // These styles are required here (not in TableSlice) because they affect the scrollable area
  // to setup the scroll padding (to avoid sticky headers overlapping the focused cell)
  const tableScrollStyle = useMemo(() => {
    // reserve space for at least 3 characters
    const numCharacters = Math.max(maxRowNumber.toLocaleString('en-US').length, 3)
    return {
      '--column-header-height': `${headerHeight}px`,
      '--row-number-characters': `${numCharacters}`,
    } as CSSProperties
  }, [maxRowNumber])

  const restrictedOnScrollKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.target !== viewportRef.current) {
      // don't handle the event if the target is not the viewport
      return
    }
    onScrollKeyDown?.(event)
  }, [onScrollKeyDown, viewportRef])

  return (
    <div ref={containerRef} className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`} style={tableScrollStyle}>
      <div className={styles.topBorder} role="presentation" />
      {/* viewport, limited height, scrollable */}
      <div className={styles.tableScroll} ref={viewportRef} role="group" aria-labelledby="caption" onKeyDown={restrictedOnScrollKeyDown} tabIndex={0}>
        {/* content canvas, full height.
          * "overflowY: clip" lets the header cell be sticked to the top of the viewport, while "overflowY: hidden" does not.
          */}
        <div ref={canvasRef} style={{ height: `${canvasHeight}px` }}>
          {/*
            * content, positioned vertically to match the viewport
            * it must never overflow the canvas, or the maths will break
            */}
          <TableSlice
            data={data}
            numRows={numRows}
            onError={onError}
            focus={focus}
            onDoubleClickCell={onDoubleClickCell}
            onMouseDownCell={onMouseDownCell}
            onKeyDownCell={onKeyDownCell}
            stringify={stringify}
            version={version}
            renderCellContent={renderCellContent}
            columnsParameters={columnsParameters}
          />
        </div>
      </div>
    </div>
  )
}

type TableSliceProps = Omit<ScrollContainerProps, 'maxRowNumber' | 'styled' | 'className'> & {
  columnsParameters: ColumnParameters[] // parameters of the columns to render
}

/**
 * Only the visible rows are fetched and rendered as HTML <tr> elements.
 */
function TableSlice({
  data,
  numRows,
  onError = console.error,
  focus = true,
  onDoubleClickCell,
  onMouseDownCell,
  onKeyDownCell,
  stringify = stringifyDefault,
  version,
  renderCellContent,
  columnsParameters,
}: TableSliceProps) {
  // contexts
  const { onTableKeyDown: onNavigationTableKeyDown, focusFirstCell } = useContext(CellNavigationContext)
  const { orderBy, onOrderByChange } = useContext(OrderByContext)
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useContext(SelectionContext)
  const { firstDataRow, numDataRows, tableOffset } = useContext(RowsSliceContext)
  const { cellPosition, shouldScroll, setShouldScroll, setShouldScrollHorizontally } = useContext(CellNavigationContext)
  const { scrollToRowIndex } = useContext(RowsSliceContext)

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

  // TODO(SL): why here? maybe in the provider?
  useEffect(() => {
    if (!shouldScroll || !scrollToRowIndex) {
      // if (!shouldScroll || !scroller || !('scrollTo' in scroller)) {
      // scrollTo does not exist in jsdom, used in the tests
      return
    }
    setShouldScroll?.(false)
    const result = scrollToRowIndex(cellPosition.rowIndex)
    if (result?.canScrollHorizontally) {
      setShouldScrollHorizontally?.(true)
    }
    // TODO(SL): scroll horizontally too!
  }, [cellPosition, shouldScroll, setShouldScroll, setShouldScrollHorizontally, scrollToRowIndex])

  // focus table on mount and later changes (when focusFirstCell is updated), so arrow keys work
  useEffect(() => {
    if (focus) {
      // Try focusing the first cell
      focusFirstCell?.()
    }
  }, [focus, focusFirstCell])

  const abortController = useRef<AbortController | undefined>(undefined)

  useEffect(() => {
    // abort the previous fetches if any
    abortController.current?.abort()
    abortController.current = new AbortController()

    data.fetch?.({
      rowStart: firstDataRow,
      rowEnd: firstDataRow + numDataRows,
      columns: columnsParameters.map(({ name }) => name),
      orderBy,
      signal: abortController.current.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fetch was aborted, ignore the error
        return
      }
      onError(error) // report the error to the parent component
    })
  }, [data, firstDataRow, numDataRows, columnsParameters, orderBy, onError])

  // Prepare the slice of data to render
  // TODO(SL): also compute progress percentage here, to show a loading indicator (percentage of resolved cells)
  const slice = useMemo(() => {
    const canMeasureColumn: Record<string, boolean> = {}
    const rowContents = Array.from({ length: numDataRows }, (_, i) => firstDataRow + i).map((row) => {
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
  }, [data, columnsParameters, firstDataRow, numDataRows, orderBy, version])

  // don't render table if header is empty
  if (!columnsParameters.length) return

  const ariaColCount = columnsParameters.length + 1 // don't forget the selection column
  const ariaRowCount = numRows + 1 // don't forget the header row
  const paddingTop = tableOffset // beware, it can be negative! TODO(SL): test that
  return (
    <>
      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>
      {/* the table */}
      <table
        aria-readonly={true}
        aria-colcount={ariaColCount}
        aria-rowcount={ariaRowCount}
        aria-multiselectable={selectable}
        aria-busy={pendingSelectionGesture /* TODO(SL): add other busy states? Used only for tests right now */}
        role="grid"
        onKeyDown={onTableKeyDown}
        style={{
          position: 'absolute',
          top: `${paddingTop}px`,
        }}
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
        </tbody>
      </table>
    </>
  )
}
