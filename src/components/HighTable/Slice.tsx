import type { KeyboardEvent } from 'react'
import { useCallback, useContext, useMemo } from 'react'

import { CellNavigationContext } from '../../contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../../contexts/ColumnVisibilityStatesContext.js'
import { OrderByContext } from '../../contexts/OrderByContext.js'
import { ScrollContext } from '../../contexts/ScrollContext.js'
import { SelectionContext } from '../../contexts/SelectionContext.js'
import { ariaOffset, defaultNumRowsPerPage } from '../../helpers/constants.js'
import { useFetchCells } from '../../hooks/useFetchCells.js'
import type { HighTableProps } from '../../types.js'
import { stringify as stringifyDefault } from '../../utils/stringify.js'
import Cell from '../Cell/Cell.js'
import Row from '../Row/Row.js'
import RowHeader from '../RowHeader/RowHeader.js'
import TableCorner from '../TableCorner/TableCorner.js'
import TableHeader from '../TableHeader/TableHeader.js'

type SliceProps = Pick<HighTableProps, 'data' | 'numRowsPerPage' | 'onDoubleClickCell' | 'onError' | 'onKeyDownCell' | 'onMouseDownCell' | 'overscan' | 'renderCellContent' | 'stringify'> & {
  /** The actual number of rows in the data frame */
  numRows: number
  /** A version number that increments whenever a data frame is updated or resolved (the key remains the same). */
  version: number
  /** Callback to set the current table corner size */
  setTableCornerSize?: (size: { width: number, height: number }) => void
}

export default function Slice({
  data,
  numRows,
  numRowsPerPage = defaultNumRowsPerPage,
  overscan,
  version,
  onDoubleClickCell,
  onError,
  onKeyDownCell,
  onMouseDownCell,
  renderCellContent,
  setTableCornerSize,
  stringify = stringifyDefault,
}: SliceProps) {
  const { cell, colCount, rowCount, goToCell } = useContext(CellNavigationContext)
  const { orderBy, onOrderByChange } = useContext(OrderByContext)
  const { selectable, toggleAllRows, pendingSelectionGesture, onTableKeyDown: onSelectionTableKeyDown, allRowsSelected, isRowSelected, toggleRowNumber, toggleRangeToRowNumber } = useContext(SelectionContext)
  const { visibleColumnsParameters: columnsParameters } = useContext(ColumnVisibilityStatesContext)
  const { renderedRowsStart, renderedRowsEnd } = useContext(ScrollContext)

  // Fetch the required cells if needed (visible + overscan)
  useFetchCells({ data, numRows, overscan, onError })

  // TODO(SL): we depend on rowIndex to trigger the scroll effect, which means we recreate the
  // callback every time the rowIndex changes. Can we avoid that?
  // For now, we don't need to depend on colIndex, we can set the state using the update function form.
  const onNavigationTableKeyDown = useCallback((event: KeyboardEvent, { numRowsPerPage }: {
    numRowsPerPage: number // number of rows to skip when navigating with the keyboard (PageUp/PageDown)
  }) => {
    const { key, altKey, ctrlKey, metaKey, shiftKey } = event
    // if the user is pressing Alt, Meta or Shift, do not handle the event
    if (altKey || metaKey || shiftKey) {
      return
    }
    let { colIndex, rowIndex } = cell
    if (key === 'ArrowRight') {
      if (ctrlKey) {
        colIndex = colCount
      } else {
        colIndex = colIndex < colCount ? colIndex + 1 : colCount
      }
    } else if (key === 'ArrowLeft') {
      if (ctrlKey) {
        colIndex = 1
      } else {
        colIndex = colIndex > 1 ? colIndex - 1 : 1
      }
    } else if (key === 'ArrowDown') {
      if (ctrlKey) {
        rowIndex = rowCount
      } else {
        rowIndex = rowIndex < rowCount ? rowIndex + 1 : rowCount
      }
    } else if (key === 'ArrowUp') {
      if (ctrlKey) {
        rowIndex = 1
      } else {
        rowIndex = rowIndex > 1 ? rowIndex - 1 : 1
      }
    } else if (key === 'Home') {
      if (ctrlKey) {
        rowIndex = 1
      }
      colIndex = 1
    } else if (key === 'End') {
      if (ctrlKey) {
        rowIndex = rowCount
      }
      colIndex = colCount
    } else if (key === 'PageDown') {
      rowIndex = Math.min(rowIndex + numRowsPerPage, rowCount)
      // TODO(SL): same for horizontal scrolling with Alt+PageDown?
    } else if (key === 'PageUp') {
      rowIndex = Math.max(rowIndex - numRowsPerPage, 1)
      // TODO(SL): same for horizontal scrolling with Alt+PageUp?
    } else if (key !== ' ') {
      // if the key is not one of the above, do not handle it
      // special case: no action is associated with the Space key, but it's captured
      // anyway to prevent the default action (scrolling the page) and stay in navigation mode
      return
    }
    // avoid scrolling the table when the user is navigating with the keyboard
    event.stopPropagation()
    event.preventDefault()
    goToCell({ colIndex, rowIndex })
  }, [cell, colCount, rowCount, goToCell])

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    onNavigationTableKeyDown(event, { numRowsPerPage })
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

  // Prepare the slice of data to render
  // TODO(SL): also compute progress percentage here, to show a loading indicator
  const slice = useMemo(() => {
    if (renderedRowsStart === undefined || renderedRowsEnd === undefined) {
      return {
        rowContents: [],
        canMeasureColumn: {},
        version,
      }
    }
    const rows = Array.from({ length: renderedRowsEnd - renderedRowsStart }, (_, i) => renderedRowsStart + i)

    const canMeasureColumn: Record<string, boolean> = {}
    const rowContents = rows.map((row) => {
      const rowNumber = data.getRowNumber({ row, orderBy })?.value
      const cells = (columnsParameters ?? []).map(({ name: column, index: originalColumnIndex, className }) => {
        const cell = data.getCell({ row, column, orderBy })
        canMeasureColumn[column] ||= cell !== undefined
        return { columnIndex: originalColumnIndex, cell, className }
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
  }, [data, columnsParameters, renderedRowsStart, renderedRowsEnd, orderBy, version])

  // don't render table if the data frame has no visible columns
  // (it can have zero rows, but must have at least one visible column)
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
              {cells.map(({ columnIndex, cell, className }, visibleColumnIndex) => {
                return (
                  <Cell
                    key={columnIndex}
                    onDoubleClickCell={onDoubleClickCell}
                    onMouseDownCell={onMouseDownCell}
                    onKeyDownCell={onKeyDownCell}
                    stringify={stringify}
                    columnIndex={columnIndex}
                    visibleColumnIndex={visibleColumnIndex}
                    className={className}
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
  )
}
