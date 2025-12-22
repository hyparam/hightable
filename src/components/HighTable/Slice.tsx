import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { DataContext } from '../../contexts/DataContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import { RowsAndColumnsContext } from '../../contexts/RowsAndColumnsContext.js'
import { SelectionContext } from '../../contexts/SelectionContext.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell, { type CellContentProps } from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'
import { ariaOffset, defaultNumRowsPerPage } from './constants.js'

export interface SliceProps {
  focus?: boolean // focus table on mount? (default true)
  numRowsPerPage?: number // number of rows per page for keyboard navigation (default 20)
  // TODO(SL): replace col: number with col: string?
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  renderCellContent?: (props: CellContentProps) => ReactNode // custom cell content component, if not provided, the default CellContent will be used
  stringify?: (value: unknown) => string | undefined
}

type Props = {
  setTableCornerSize?: (size: { width: number, height: number }) => void // callback to set the current table corner size
} & SliceProps

export default function Slice({
  focus = true,
  numRowsPerPage = defaultNumRowsPerPage,
  onDoubleClickCell,
  onKeyDownCell,
  onMouseDownCell,
  renderCellContent,
  setTableCornerSize,
  stringify = stringifyDefault,
}: Props) {
  const { data, version, numRows } = useContext(DataContext)
  const { onTableKeyDown: onNavigationTableKeyDown, focusFirstCell } = useContext(CellNavigationContext)
  const { orderBy, onOrderByChange } = useContext(OrderByContext)
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useContext(SelectionContext)
  const { columnsParameters, rowsRangeWithPadding } = useContext(RowsAndColumnsContext)

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown?.(event, { numRowsPerPage })
    onSelectionTableKeyDown?.(event)
  }, [onNavigationTableKeyDown, onSelectionTableKeyDown, numRowsPerPage])

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
  // Note that the dependency upon data and numRows was removed, because focusFirstCell should depend on them
  // TODO(SL): move to CellNavigationProvider?
  useEffect(() => {
    if (focus) {
      // Try focusing the first cell
      focusFirstCell?.()
    }
  }, [focus, focusFirstCell])

  // Prepare the slice of data to render
  // TODO(SL): also compute progress percentage here, to show a loading indicator
  const slice = useMemo(() => {
    if (!rowsRangeWithPadding) {
      return {
        prePadding: [],
        postPadding: [],
        rowContents: [],
        canMeasureColumn: {},
        version,
      }
    }
    const { startPadding, start, end, endPadding } = rowsRangeWithPadding
    // add empty pre and post rows to fill the viewport
    const prePadding = Array.from({ length: start - startPadding }, (_, i) => ({ row: startPadding + i }))
    const rows = Array.from({ length: end - start }, (_, i) => start + i)
    const postPadding = Array.from({ length: endPadding - end }, (_, i) => ({ row: end + i }))

    const canMeasureColumn: Record<string, boolean> = {}
    const rowContents = rows.map((row) => {
      const rowNumber = data.getRowNumber({ row, orderBy })?.value
      const cells = (columnsParameters ?? []).map(({ name: column, index: originalColumnIndex }) => {
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
      prePadding,
      postPadding,
      rowContents,
      canMeasureColumn,
      version,
    }
  }, [data, columnsParameters, rowsRangeWithPadding, orderBy, version])

  // don't render table if header is empty
  if (!columnsParameters) return

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
            setTableCornerSize={setTableCornerSize}
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
        {slice.prePadding.map(({ row }) => {
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
        {slice.postPadding.map(({ row }) => {
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
