import React from 'react'

interface Props {
  checked?: boolean
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
  showCheckBox?: boolean
  style?: React.CSSProperties
}

function RowHeader({ children, checked, onClick, showCheckBox, style }: Props) {
  return (
    <th scope="row" role="rowheader" style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </th>
  )
}

export default RowHeader
