import React from 'react'
import { formatRowNumber } from '../helpers/text.js'
import { PartialRow } from '../row.js'
import Cell from './Cell.js'
import RowHeader from './RowHeader.js'

interface Props {
  columns: string[]
  columnStyles: React.CSSProperties[]
  cornerStyle?: React.CSSProperties
  data: PartialRow
  onSelectRowClick?: (event: React.MouseEvent) => void
  onDoubleClickCell?: (e: React.MouseEvent, col: number, row?: number) => void
  onMouseDownCell?: (e: React.MouseEvent, col: number, row?: number) => void
  selected?: boolean
  showSelection: boolean
  stringify: (value: unknown) => string | undefined
  tableIndex: number
}

function Row({
  columns,
  columnStyles,
  cornerStyle,
  data,
  onSelectRowClick,
  onDoubleClickCell,
  onMouseDownCell,
  selected,
  showSelection,
  stringify,
  tableIndex,
}: Props) {
  const ariaRowIndex = tableIndex + 2 // 1-based + the header row
  return (
    <tr
      role="row"
      aria-rowindex={ariaRowIndex}
      title={rowError(data, columns.length)}
      className={selected ? 'selected' : undefined} // TODO: use [aria-selected] instead in CSS
      aria-selected={selected}
    >
      <RowHeader
        cornerStyle={cornerStyle}
        dataIndex={data.index}
        onClick={onSelectRowClick}
        selected={selected}
        showSelection={showSelection}
      />
      {columns.map((column, columnIndex) =>
        <Cell
          key={columnIndex}
          columnStyle={columnStyles[columnIndex]}
          onDoubleClick={e => { onDoubleClickCell?.(e, columnIndex, data.index) }}
          onMouseDown={e => { onMouseDownCell?.(e, columnIndex, data.index) }}
          stringify={stringify}
          value={data.cells[column]}
        />
      )}
    </tr>
  )
}

/**
 * Validate row length
 */
function rowError(row: PartialRow, length: number): string | undefined {
  const numKeys = Object.keys(row.cells).length
  if (numKeys > 0 && numKeys !== length) {
    return `Row ${formatRowNumber(row.index)} length ${numKeys} does not match header length ${length}`
  }
}

export default Row
