import type { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useContext } from 'react'

import { TableCornerContext } from '../../contexts/TableCornerContext.js'
import { useCellFocus } from '../../hooks/useCellFocus.js'

interface Props {
  checked?: boolean
  children?: ReactNode
  onCheckboxPress?: () => void
  pendingSelectionGesture?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

export default function TableCorner({ children, checked, onCheckboxPress, pendingSelectionGesture, style, ariaColIndex, ariaRowIndex }: Props) {
  const { tableCornerRef } = useContext(TableCornerContext)
  const { tabIndex, navigateToCell } = useCellFocus({ ref: tableCornerRef, ariaColIndex, ariaRowIndex })
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
  const onChange = useCallback((e: ChangeEvent) => {
    e.preventDefault()
  }, [])

  return (
    <td
      ref={tableCornerRef}
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
        showCheckBox
          ? (
              <input
                type="checkbox"
                onChange={onChange}
                readOnly={disabledCheckbox}
                disabled={disabledCheckbox}
                aria-busy={pendingSelectionGesture}
                checked={checked}
                role="presentation"
                tabIndex={-1}
              />
            )
          : <span>{children}</span>
      }
    </td>
  )
}
