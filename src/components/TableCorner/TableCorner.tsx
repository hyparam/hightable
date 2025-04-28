import { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex?: number
}

export default function TableCorner({ children, checked, onClick, showCheckBox, style, ariaColIndex }: Props) {
  return (
    <td aria-disabled={!showCheckBox} style={style} onClick={onClick} aria-colindex={ariaColIndex}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
