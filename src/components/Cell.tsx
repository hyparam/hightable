import React from 'react'

interface Props {
  columnStyle?: React.CSSProperties
  onDoubleClick?: (event: React.MouseEvent) => void
  onMouseDown?: (event: React.MouseEvent) => void
  stringify: (value: unknown) => string | undefined
  value: any
}

/**
 * Render a table cell <td> with title and optional custom rendering
 *
 * @param props
 * @param props.value cell value
 * @param props.columnStyle CSS properties
 * @param props.onDoubleClick double click callback
 * @param props.onMouseDown mouse down callback
 */
function Cell({ columnStyle, onDoubleClick, onMouseDown, stringify, value }: Props) {
  // render as truncated text
  const str = React.useMemo(() => {
    return stringify(value)
  }, [stringify, value])
  const title = React.useMemo(() => {
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
      role="cell"
      className={str === undefined ? 'pending' : undefined}
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      style={columnStyle}
      title={title}>
      {str}
    </td>
  )
}

export default Cell
