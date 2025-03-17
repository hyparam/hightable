import { CSSProperties, MouseEvent, ReactNode } from 'react'
import classes from './RowHeader.module.css'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
}

export default function RowHeader({ children, checked, onClick, showCheckBox, style }: Props) {
  const selectable = !!onClick
  return (
    <th className={`${classes.rowHeader} ${selectable ? classes.selectable : ''} ${checked ? classes.checked : ''}`} scope="row" role="rowheader" style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </th>
  )
}
