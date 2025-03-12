import React from 'react'
import { formatRowNumber } from '../helpers/text.js'

interface Props {
  cornerStyle?: React.CSSProperties
  dataIndex?: number
  onClick?: (event: React.MouseEvent) => void
  selected?: boolean
  showSelection?: boolean
}

function RowHeader({ cornerStyle, dataIndex, onClick, selected, showSelection }: Props) {
  return (
    <th scope="row" role="rowheader" style={cornerStyle} onClick={onClick}>
      <span>{formatRowNumber(dataIndex)}</span>
      { showSelection && <input type='checkbox' checked={selected} readOnly /> }
    </th>
  )
}

export default RowHeader
