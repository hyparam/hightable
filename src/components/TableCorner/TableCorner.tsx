import { CSSProperties, MouseEvent, ReactNode, useRef } from 'react'
import { useTabIndex } from '../../hooks/useFocus'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

export default function TableCorner({ children, checked, onClick, showCheckBox, style, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const tabIndex = useTabIndex({ ref, ariaColIndex, ariaRowIndex })

  return (
    <td
      ref={ref}
      aria-disabled={!showCheckBox}
      style={style}
      onClick={onClick}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
    >
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
