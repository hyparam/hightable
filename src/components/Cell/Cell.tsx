import { KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataFrame, DataFrameEvents, ResolvedValue } from '../../helpers/dataframe/index.js'
import { OrderBy, areEqualOrderBy } from '../../helpers/sort.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import { useColumnStates } from '../../hooks/useColumnStates.js'
import { useRow } from '../../hooks/useUnsortedRow.js'

interface Props {
  ariaColIndex: number
  ariaRowIndex: number
  column: string
  columnIndex: number
  data: DataFrame
  rowIndex: number
  stringify: (value: unknown) => string | undefined
  className?: string
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  orderBy?: OrderBy
}

/**
 * Render a table cell <td> with title and optional custom rendering
 *
 * @param {Object} props
 * @param {number} props.ariaColIndex aria col index
 * @param {number} props.ariaRowIndex aria row index
 * @param {string} props.column column name in the dataframe
 * @param {number} props.columnIndex column index in the table (0-based)
 * @param {DataFrame} props.data the dataframe to get the cell from
 * @param {number} props.rowIndex row index in the table (0-based)
 * @param {function} props.stringify function to stringify the value
 * @param {string} [props.className] class name
 * @param {function} [props.onDoubleClick] double click callback
 * @param {function} [props.onMouseDown] mouse down callback
 * @param {function} [props.onKeyDown] key down callback
 * @param {OrderBy} [props.orderBy] order by to sort the dataframe
 */
export default function Cell({ data, rowIndex, column, orderBy, onDoubleClickCell, onMouseDownCell, onKeyDownCell, stringify, columnIndex, className, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { unsortedRow } = useRow()
  const [cell, setCell] = useState<ResolvedValue | undefined>(() => {return data.getCell({ row: rowIndex, column, orderBy })})
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })

  const handleMouseDown = useCallback((event: MouseEvent) => {
    navigateToCell()
    if (onMouseDownCell && unsortedRow !== undefined) {
      onMouseDownCell(event, columnIndex, unsortedRow)
    }
  }, [navigateToCell, onMouseDownCell, unsortedRow, columnIndex])
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    if (onDoubleClickCell && unsortedRow !== undefined) {
      onDoubleClickCell(event, columnIndex, unsortedRow)
    }
  }, [navigateToCell, onDoubleClickCell, unsortedRow, columnIndex])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // No need to navigate to the cell when using the keyboard, it is already focused
    if (onKeyDownCell && unsortedRow !== undefined) {
      onKeyDownCell(event, columnIndex, unsortedRow)
    }
  }, [onKeyDownCell, unsortedRow, columnIndex])

  useEffect(() => {
    // update cell when data or orderBy changes
    setCell(data.getCell({ row: rowIndex, column, orderBy }))
    // and listen for updates to the dataframe (the cell might still be undefined)
    function onFetchEvent(event: CustomEvent<DataFrameEvents['dataframe:update']>) {
      const { rowStart, rowEnd, columns, orderBy: eventOrderBy } = event.detail
      if (rowStart <= rowIndex && rowIndex < rowEnd && columns.includes(column) && areEqualOrderBy(orderBy, eventOrderBy)) {
        // the cell data has been fetched (or cleaned)
        setCell(data.getCell({ row: rowIndex, column, orderBy }))
      }
    }
    data.eventTarget.addEventListener('dataframe:update', onFetchEvent)
    return () => {
      data.eventTarget.removeEventListener('dataframe:update', onFetchEvent)
    }
  }, [data, rowIndex, column, orderBy])

  // Get the column width from the context
  const { getColumnStyle } = useColumnStates()
  const columnStyle = getColumnStyle?.(columnIndex)

  // render as truncated text
  const str = useMemo(() => {
    return stringify(cell?.value)
  }, [stringify, cell])
  const title = useMemo(() => {
    if (str === undefined ) {
      return undefined
    }
    if (str.length > 400) {
      return `${str.slice(0, 397)}\u2026` // ...
    }
    if (str.length > 100) {
      return str
    }
  }, [str])
  return (
    <td
      ref={ref}
      role="cell"
      aria-busy={cell === undefined}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      data-rowindex={unsortedRow}
      tabIndex={tabIndex}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      style={columnStyle}
      className={className}
      title={title}>
      {str}
    </td>
  )
}
