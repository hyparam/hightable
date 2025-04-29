import { CSSProperties, MouseEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellFocus } from '../../hooks/useFocus'

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
  const { tabIndex, focusCell } = useCellFocus({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    focusCell()
    onClick?.(event)
  }, [onClick, focusCell])

  return (
    <td
      ref={ref}
      aria-disabled={!showCheckBox}
      style={style}
      onClick={handleClick}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
    >
      <span>{children}</span>
      { showCheckBox && <input type='checkbox' checked={checked} readOnly /> }
    </td>
  )
}
