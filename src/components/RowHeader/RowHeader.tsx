import { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, ReactNode, useCallback, useRef } from 'react'
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
  const showCheckBox = checked !== undefined
  const disabledCheckbox = onCheckboxPress === undefined
  const onChange = useCallback((e: ChangeEvent) => {e.preventDefault()}, [])

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
      aria-disabled={disabledCheckbox}
      tabIndex={tabIndex}
      data-rowindex={dataRowIndex}
    >
      <span>{children}</span>
      {showCheckBox && <input
        type='checkbox'
        onChange={onChange}
        readOnly={disabledCheckbox}
        disabled={disabledCheckbox}
        checked={checked}
        role="presentation"
        tabIndex={-1}
      />}
    </th>
  )
}
