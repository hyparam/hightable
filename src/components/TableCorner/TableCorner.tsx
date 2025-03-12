import React from 'react'

interface Props {
  checked?: boolean
  children?: React.ReactNode
  onClick?: (event: React.MouseEvent) => void
  showCheckBox?: boolean
  style?: React.CSSProperties
}

function TableCorner({ children, checked, onClick, showCheckBox, style }: Props) {
  return (
    <td className={`table-corner${showCheckBox ? ' show-checkbox' : ''}`} style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}

export default TableCorner
