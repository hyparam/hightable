import { CSSProperties, ChangeEvent, KeyboardEvent, ReactNode, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'

interface Props {
  checked?: boolean
  children?: ReactNode
  onCheckboxPress?: () => void
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

export default function TableCorner({ children, checked, onCheckboxPress, style, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback(() => {
    navigateToCell()
    onCheckboxPress?.()
  }, [onCheckboxPress, navigateToCell])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // TODO: let the event propagate?
      event.stopPropagation()
      onCheckboxPress?.()
    }
  }, [onCheckboxPress])
  const showCheckBox = checked !== undefined
  const disabledCheckbox = onCheckboxPress === undefined
  const onChange = useCallback((e: ChangeEvent) => {e.preventDefault()}, [])

  return (
    <td
      ref={ref}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-checked={checked}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      aria-disabled={disabledCheckbox}
      tabIndex={tabIndex}
    >
      {
        showCheckBox ?
          <input
            type='checkbox'
            onChange={onChange}
            readOnly={disabledCheckbox}
            disabled={disabledCheckbox}
            checked={checked}
            role="presentation"
            tabIndex={-1}
          />
          :
          <span>{children}</span>
      }
    </td>
  )
}
