import type { ChangeEvent, CSSProperties, KeyboardEvent, ReactNode } from 'react'
import { useCallback, useEffect, useRef } from 'react'

import { useCellFocus } from '../../hooks/useCellFocus.js'

interface Props {
  checked?: boolean
  children?: ReactNode
  onCheckboxPress?: () => void
  pendingSelectionGesture?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
  setTableCornerWidth?: (width: number) => void // callback to set the current table corner width
}

export default function TableCorner({ children, checked, onCheckboxPress, pendingSelectionGesture, style, ariaColIndex, ariaRowIndex, setTableCornerWidth }: Props) {
  const tableCornerRef = useRef<HTMLTableCellElement>(null)
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

  /* Track the size of the table corner */
  useEffect(() => {
    const tableCorner = tableCornerRef.current
    if (!setTableCornerWidth) {
      // Width tracking is disabled intentionally when no callback is provided.
      return
    }
    if (!tableCorner) {
      console.warn('Table corner element is not available. Table corner size will not be tracked accurately.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.ResizeObserver) {
      // for jsdom
      return
    }

    // Use an arrow function to get correct tableCorner type (not null)
    // eslint-disable-next-line func-style
    const updateTableCornerWidth = () => {
      setTableCornerWidth(tableCorner.offsetWidth)
    }

    // run once
    updateTableCornerWidth()

    // listener
    const resizeObserver = new window.ResizeObserver(([entry]) => {
      if (!entry) {
        console.warn('ResizeObserver entry is not available.')
        return
      }
      updateTableCornerWidth()
    })
    resizeObserver.observe(tableCorner)
    return () => {
      resizeObserver.unobserve(tableCorner)
      resizeObserver.disconnect()
    }
  }, [setTableCornerWidth])

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
