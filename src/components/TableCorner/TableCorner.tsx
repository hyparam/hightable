import { CSSProperties, MouseEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'

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
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onClick?.(event)
  }, [onClick, navigateToCell])

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
