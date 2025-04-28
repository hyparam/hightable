import { CSSProperties, MouseEvent, ReactNode } from 'react'

interface Props {
  busy?: boolean
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex?: number
  tabIndex?: number
}

export default function RowHeader({ children, checked, onClick, showCheckBox, style, busy, ariaColIndex, tabIndex }: Props) {
  const disabled = !onClick
  return (
    <th
      scope="row"
      role="rowheader"
      style={style}
      onClick={onClick}
      aria-busy={busy}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
    >
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' disabled={disabled} checked={checked} readOnly /> }
    </th>
  )
}
