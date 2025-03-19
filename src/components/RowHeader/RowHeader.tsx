import { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
}

export default function RowHeader({ children, checked, onClick, showCheckBox, style }: Props) {
  const disabled = !onClick
  return (
    <th scope="row" role="rowheader" style={style} onClick={onClick}>
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' disabled={disabled} checked={checked} readOnly /> }
    </th>
  )
}
