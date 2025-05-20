import { CSSProperties, MouseEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'

interface Props {
  checked?: boolean
  children?: ReactNode
  onClick?: (event: MouseEvent) => void
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

export default function TableCorner({ children, checked, onClick, style, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onClick?.(event)
  }, [onClick, navigateToCell])
  // show the checkbox if it has a value, or if a click callback is provided

  return (
    <td
      ref={ref}
      style={style}
      onClick={handleClick}
      aria-checked={checked}
      aria-colindex={ariaColIndex}
      aria-disabled={onClick === undefined}
      tabIndex={tabIndex}
    >
      <span>{children}</span>
      {
        // TODO: use an icon instead of a checkbox
        checked !== undefined && <input type='checkbox' disabled={true} checked={checked} role="presentation" />
      }
    </td>
  )
}
