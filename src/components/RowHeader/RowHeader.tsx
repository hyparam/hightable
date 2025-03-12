import React from 'react'
import { formatRowNumber } from '../../helpers/text.js'

interface Props {
  style?: React.CSSProperties
  dataIndex?: number
  onClick?: (event: React.MouseEvent) => void
  selected?: boolean
  showSelection?: boolean
}

function RowHeader({ style, dataIndex, onClick, selected, showSelection }: Props) {
  return (
    <th scope="row" role="rowheader" style={style} onClick={onClick}>
      <span>{formatRowNumber(dataIndex)}</span>
      { showSelection && <input type='checkbox' checked={selected} readOnly /> }
    </th>
  )
}

export default RowHeader
