import { KeyboardEvent, MouseEvent, useCallback, useMemo, useRef } from 'react'
import { ResolvedValue } from '../../helpers/dataframe/index.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import { useColumnStates } from '../../hooks/useColumnStates.js'

interface Props {
  ariaColIndex: number
  ariaRowIndex: number
  columnIndex: number
  stringify: (value: unknown) => string | undefined
  cell?: ResolvedValue
  className?: string
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  unsortedRow?: number // the row index in the original data, undefined if the value has not been fetched yet
}

/**
 * Render a table cell <td> with title and optional custom rendering
 *
 * @param {Object} props
 * @param {number} props.ariaColIndex aria col index
 * @param {number} props.ariaRowIndex aria row index
 * @param {number} props.columnIndex column index in the table (0-based)
 * @param {function} props.stringify function to stringify the value
 * @param {ResolvedValue} [props.cell] cell value, undefined if the value has not been fetched yet
 * @param {string} [props.className] class name
 * @param {function} [props.onDoubleClick] double click callback
 * @param {function} [props.onMouseDown] mouse down callback
 * @param {function} [props.onKeyDown] key down callback
 * @param {number} [props.unsortedRow] the row index in the original data, undefined if the value has not been fetched yet
 */
export default function Cell({ cell, onDoubleClickCell, onMouseDownCell, onKeyDownCell, stringify, columnIndex, className, ariaColIndex, ariaRowIndex, unsortedRow }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
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
