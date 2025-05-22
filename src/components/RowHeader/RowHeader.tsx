import { CSSProperties, KeyboardEvent, MouseEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'

interface Props {
  busy?: boolean
  checked?: boolean
  children?: ReactNode
  onCheckboxPress?: (shiftKey: boolean) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
  dataRowIndex?: number // optional, index of the row in the dataframe (0-based)
}

export default function RowHeader({ children, checked, onCheckboxPress, style, busy, ariaColIndex, ariaRowIndex, dataRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onCheckboxPress?.(event.shiftKey)
  }, [onCheckboxPress, navigateToCell])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // TODO: let the event propagate?
      event.stopPropagation()
      onCheckboxPress?.(event.shiftKey)
    }
  }, [onCheckboxPress])

  return (
    <th
      ref={ref}
      scope="row"
      role="rowheader"
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-busy={busy}
      aria-checked={checked}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      aria-disabled={onCheckboxPress === undefined}
      tabIndex={tabIndex}
      data-rowindex={dataRowIndex}
    >
      <span>{children}</span>
      {
        // TODO: use an icon instead of a checkbox
        checked !== undefined && <input type='checkbox' disabled={true} checked={checked} role="presentation" />
      }
    </th>
  )
}
