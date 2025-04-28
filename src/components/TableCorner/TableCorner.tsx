import { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex?: number
  tabIndex?: number
}

export default function TableCorner({ children, checked, onClick, showCheckBox, style, ariaColIndex, tabIndex }: Props) {
  return (
    <td aria-disabled={!showCheckBox} style={style} onClick={onClick} aria-colindex={ariaColIndex} tabIndex={tabIndex}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
