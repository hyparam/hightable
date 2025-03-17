import { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
}

export default function TableCorner({ children, checked, onClick, showCheckBox, style }: Props) {
  return (
    <td className={`table-corner${showCheckBox ? ' show-checkbox' : ''}`} style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
