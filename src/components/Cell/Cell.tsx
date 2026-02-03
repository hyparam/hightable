import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

import { ColumnWidthsContext } from '../../contexts/ColumnWidthsContext.js'
import type { ResolvedValue } from '../../helpers/dataframe/index.js'
import { useCellFocus } from '../../hooks/useCellFocus.js'
import { useOnCopy } from '../../hooks/useOnCopyToClipboard.js'

export interface CellContentProps {
  stringify: (value: unknown) => string | undefined
  cell?: ResolvedValue
  col: number
  row?: number // the row index in the original data, undefined if the value has not been fetched yet
}

interface Props {
  ariaColIndex: number
  ariaRowIndex: number
  columnIndex: number // original column index in the dataframe (used for callbacks like onDoubleClickCell)
  visibleColumnIndex: number // index in the visible columns array (used for styling/widths)
  stringify: (value: unknown) => string | undefined
  cell?: ResolvedValue
  className?: string
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void // for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
  rowNumber?: number // the row index in the original data, undefined if the value has not been fetched yet
  renderCellContent?: (props: CellContentProps) => ReactNode // custom cell content component, if not provided, the default stringified value will be used
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
 * @param {number} [props.rowNumber] the row index in the original data, undefined if the value has not been fetched yet
 */
export default function Cell({ cell, onDoubleClickCell, onMouseDownCell, onKeyDownCell, stringify, columnIndex, visibleColumnIndex, className, ariaColIndex, ariaRowIndex, rowNumber, renderCellContent }: Props) {
  const { tabIndex, navigateToCell, focusIfNeeded } = useCellFocus({ ariaColIndex, ariaRowIndex })

  // Focus the cell if needed. We use an effect, as it acts on the DOM element after render.
  const ref = useRef<HTMLTableCellElement | null>(null)
  useEffect(() => {
    focusIfNeeded?.(ref.current)
  }, [focusIfNeeded])

  // Get the column width from the context (use visibleColumnIndex for styling)
  const columnStyle = useContext(ColumnWidthsContext).getStyle?.(visibleColumnIndex)
  // render as truncated text
  const str = useMemo(() => {
    return stringify(cell?.value)
  }, [stringify, cell])
  const title = useMemo(() => {
    if (str === undefined) {
      return undefined
    }
    if (str.length > 400) {
      return `${str.slice(0, 397)}\u2026` // ...
    }
    if (str.length > 100) {
      return str
    }
  }, [str])
  const content = useMemo(() => {
    return renderCellContent?.({ cell, stringify, col: columnIndex, row: rowNumber }) ?? str
  }, [cell, stringify, columnIndex, rowNumber, renderCellContent, str])

  const handleMouseDown = useCallback((event: MouseEvent) => {
    navigateToCell()
    if (onMouseDownCell && rowNumber !== undefined) {
      onMouseDownCell(event, columnIndex, rowNumber)
    }
  }, [navigateToCell, onMouseDownCell, rowNumber, columnIndex])
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    if (onDoubleClickCell && rowNumber !== undefined) {
      onDoubleClickCell(event, columnIndex, rowNumber)
    }
  }, [navigateToCell, onDoubleClickCell, rowNumber, columnIndex])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // No need to navigate to the cell when using the keyboard, it is already focused
    if (onKeyDownCell && rowNumber !== undefined) {
      onKeyDownCell(event, columnIndex, rowNumber)
    }
  }, [onKeyDownCell, rowNumber, columnIndex])
  const handleCopy = useOnCopy(str)

  return (
    <td
      ref={ref}
      role="cell"
      aria-busy={cell === undefined}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      data-rownumber={rowNumber}
      tabIndex={tabIndex}
      onCopy={handleCopy}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={handleKeyDown}
      style={columnStyle}
      className={className}
      title={title}
    >
      {content}
    </td>
  )
}
