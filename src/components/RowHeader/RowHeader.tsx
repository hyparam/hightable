import { CSSProperties, MouseEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'

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

export default function RowHeader({ children, checked, onClick, style, busy, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onClick?.(event)
  }, [onClick, navigateToCell])

  return (
    <th
      ref={ref}
      scope="row"
      role="rowheader"
      style={style}
      onClick={handleClick}
      aria-busy={busy}
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
    </th>
  )
}
