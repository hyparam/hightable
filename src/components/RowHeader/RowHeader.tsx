import { CSSProperties, MouseEvent, ReactNode, useRef } from 'react'
import { useTabIndex } from '../../hooks/useFocus'

interface Props {
  busy?: boolean
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

export default function RowHeader({ children, checked, onClick, showCheckBox, style, busy, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const tabIndex = useTabIndex({ ref, ariaColIndex, ariaRowIndex })

  const disabled = !onClick
  return (
    <th
      ref={ref}
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
