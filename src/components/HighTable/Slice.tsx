import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { ColumnParametersContext } from '../../contexts/ColumnParametersContext.js'
import { ColumnVisibilityStatesContext } from '../../contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { ErrorContext } from '../../contexts/ErrorContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import { SelectionContext } from '../../contexts/SelectionContext.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell, { type CellContentProps } from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
import { defaultOverscan, defaultPadding, rowHeight } from './constants.js'

const ariaOffset = 2 // 1-based index, +1 for the header

export interface SliceProps {
  focus?: boolean // focus table on mount? (default true)
  overscan?: number // number of rows to fetch outside of the viewport
  padding?: number // number of padding rows to render outside of the viewport
  // TODO(SL): replace col: number with col: string?
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  renderCellContent?: (props: CellContentProps) => ReactNode // custom cell content component, if not provided, the default CellContent will be used
  stringify?: (value: unknown) => string | undefined
}

type Props = {
  scrollHeight: number | undefined
  scrollTop: number | undefined
  viewportHeight: number | undefined
  scrollToTop: ((top: number) => void) | undefined
} & SliceProps

export default function Slice({
  focus = true,
  overscan = defaultOverscan,
  padding = defaultPadding,
  scrollHeight,
  scrollTop,
  viewportHeight,
  onDoubleClickCell,
  onKeyDownCell,
  onMouseDownCell,
  renderCellContent,
  scrollToTop,
  stringify = stringifyDefault,
}: Props) {
  const abortControllerRef = useRef<AbortController>(null)

  const { data, version, numRows } = useContext(DataContext)
  const { shouldScroll, setShouldScroll, cellPosition } = useContext(CellNavigationContext)
  const allColumnsParameters = useContext(ColumnParametersContext)
  const { isHiddenColumn } = useContext(ColumnVisibilityStatesContext)
  const { onTableKeyDown: onNavigationTableKeyDown, focusFirstCell } = useContext(CellNavigationContext)
  const { orderBy, onOrderByChange } = useContext(OrderByContext)
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useContext(SelectionContext)
  const { onError } = useContext(ErrorContext)

  const columnsParameters = useMemo(() => {
    return allColumnsParameters.filter((col) => {
      return !isHiddenColumn?.(col.name)
    })
  }, [allColumnsParameters, isHiddenColumn])

  const rowsRange = useMemo(() => {
    if (
      // viewport not ready yet
      scrollTop === undefined
      || scrollHeight === undefined
      || viewportHeight === undefined
      // nothing to render - should not happen because it should always contain the header row
      || scrollHeight === 0
    ) {
      return undefined
    }
    // TODO(SL): remove this fallback? It's only for the tests, where the elements have zero height
    const clientHeight = viewportHeight === 0 ? 100 : viewportHeight

    // determine rows to fetch based on current scroll position (indexes refer to the virtual table domain)
    const startView = Math.floor(numRows * scrollTop / scrollHeight)
    const endView = Math.ceil(numRows * (scrollTop + clientHeight) / scrollHeight)
    const start = Math.max(0, startView - overscan)
    const end = Math.min(numRows, endView + overscan)

    if (isNaN(start)) throw new Error(`invalid start row ${start}`)
    if (isNaN(end)) throw new Error(`invalid end row ${end}`)
    if (end - start > 1000) throw new Error(`attempted to render too many rows ${end - start} table must be contained in a scrollable div`)

    return { start, end }
  }, [numRows, overscan, scrollHeight, scrollTop, viewportHeight])

  // total scrollable height
  /* TODO: fix the computation on unstyled tables */
  const tableOffset = useMemo(() => {
    return Math.max(0, (rowsRange?.start ?? 0) - padding) * rowHeight
  }, [rowsRange, padding])

  // scroll if the navigation cell changed, or if entering navigation mode
  // this excludes the case where the whole table is focused (not in cell navigation mode), the user
  // is scrolling with the mouse or the arrow keys, and the cell exits the viewport: don't want to scroll
  // back to it
  useEffect(() => {
    if (!shouldScroll || scrollTop === undefined || scrollToTop === undefined || rowsRange === undefined) {
      return
    }
    setShouldScroll?.(false)
    const row = cellPosition.rowIndex - ariaOffset
    let nextScrollTop = scrollTop
    // if row outside of the rows range, scroll to the estimated position of the cell,
    // to wait for the cell to be fetched and rendered
    if (row < rowsRange.start || row >= rowsRange.end) {
      nextScrollTop = row * rowHeight
    }
    if (nextScrollTop !== scrollTop) {
      // scroll to the cell
      scrollToTop(nextScrollTop)
    }
  }, [cellPosition, shouldScroll, rowsRange, setShouldScroll, scrollToTop, scrollTop])

  // handle scrolling and component resizing
  useEffect(() => {
    if (!data.fetch || rowsRange === undefined) {
      return
    }
    // abort the previous fetches if any
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    data.fetch({
      rowStart: rowsRange.start,
      rowEnd: rowsRange.end,
      columns: columnsParameters.map(({ name }) => name),
      orderBy,
      signal: abortController.signal,
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // fetch was aborted, ignore the error
        return
      }
      onError?.(error)
    })
  }, [data, orderBy, onError, columnsParameters, rowsRange])

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event, { numRowsPerPage: padding })
    onSelectionTableKeyDown?.(event)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown, padding])

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
  // TODO(SL): move to CellNavigationProvider?
  useEffect(() => {
    if (focus) {
      // Try focusing the first cell
      focusFirstCell?.()
    }
  }, [focus, focusFirstCell])

  // add empty pre and post rows to fill the viewport
  const offset = rowsRange?.start ?? 0
  const rowsLength = (rowsRange?.end ?? 0) - offset
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
