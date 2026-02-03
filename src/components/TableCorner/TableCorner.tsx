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
  setTableCornerSize?: (size: { width: number, height: number }) => void // callback to set the current table corner size
}

export default function TableCorner({ children, checked, onCheckboxPress, pendingSelectionGesture, style, ariaColIndex, ariaRowIndex, setTableCornerSize }: Props) {
  const { tabIndex, navigateToCell, focusIfNeeded } = useCellFocus({ ariaColIndex, ariaRowIndex })

  // Focus the cell if needed. We use an effect, as it acts on the DOM element after render.
  const ref = useRef<HTMLTableCellElement | null>(null)
  useEffect(() => {
    focusIfNeeded?.(ref.current)
  }, [focusIfNeeded])

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

  const trackSize = useCallback((tableCorner: HTMLTableCellElement | null) => {
    if (!setTableCornerSize) {
      // Size tracking is disabled intentionally when no callback is provided.
      return
    }
    if (!tableCorner) {
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.ResizeObserver) {
      // for jsdom
      return
    }

    // Use an arrow function to get correct tableCorner type (not null)
    // eslint-disable-next-line func-style
    const updateTableCornerSize = () => {
      setTableCornerSize({ width: tableCorner.offsetWidth, height: tableCorner.offsetHeight })
    }

    // run once
    updateTableCornerSize()

    // listener
    const resizeObserver = new window.ResizeObserver(([entry]) => {
      if (!entry) {
        console.warn('ResizeObserver entry is not available.')
        return
      }
      updateTableCornerSize()
    })
    resizeObserver.observe(tableCorner)
    return () => {
      resizeObserver.unobserve(tableCorner)
      resizeObserver.disconnect()
    }
    /* Track the size of the table corner */
  }, [setTableCornerSize])

  const refCallback = useCallback((tableCorner: HTMLTableCellElement | null) => {
    ref.current = tableCorner
    const removeSizeTracking = trackSize(tableCorner)
    return removeSizeTracking
  }, [trackSize])

  return (
    <td
      ref={refCallback}
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
