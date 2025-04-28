import { MouseEvent, useMemo, useRef } from 'react'
import useColumnWidth from '../../hooks/useColumnWidth.js'
import { useTabIndex } from '../../hooks/useFocus.js'

interface Props {
  onDoubleClick?: (event: MouseEvent) => void
  onMouseDown?: (event: MouseEvent) => void
  stringify: (value: unknown) => string | undefined
  value: any
  columnIndex: number
  hasResolved: boolean
  ariaColIndex: number
  ariaRowIndex: number
  className?: string
}

/**
 * Render a table cell <td> with title and optional custom rendering
 *
 * @param props
 * @param props.value cell value
 * @param props.columnIndex column index in the dataframe (0-based)
 * @param props.onDoubleClick double click callback
 * @param props.onMouseDown mouse down callback
 * @param props.stringify function to stringify the value
 * @param props.hasResolved function to get the column style
 * @param props.ariaColIndex aria col index
 * @param props.ariaRowIndex aria row index
 * @param props.className optional class name
 */
export default function Cell({ onDoubleClick, onMouseDown, stringify, columnIndex, value, hasResolved, className, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const tabIndex = useTabIndex({ ref, ariaColIndex, ariaRowIndex })

  // Get the column width from the context
  const { getColumnStyle } = useColumnWidth()
  const columnStyle = getColumnStyle?.(columnIndex)

  // render as truncated text
  const str = useMemo(() => {
    return stringify(value)
  }, [stringify, value])
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
      aria-busy={!hasResolved}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      style={columnStyle}
      className={className}
      title={title}>
      {str}
    </td>
  )
}
