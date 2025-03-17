import { CSSProperties, MouseEvent, ReactNode } from 'react'
import classes from './TableCorner.module.css'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
}

export default function TableCorner({ children, checked, onClick, showCheckBox, style }: Props) {
  const selectable = !!onClick
  return (
    <td className={`${classes.tableCorner} ${selectable ? classes.selectable : ''} ${showCheckBox ? classes.showCheckBox : ''}`} style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
