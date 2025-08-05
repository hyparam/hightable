import { KeyboardEvent, MouseEvent, PointerEvent, useCallback, useMemo, useState } from 'react'

interface InitialPointerState {
  pointerId: number
  width: number
  clientX: number
}

interface Props {
  autoResize?: () => void
  forceWidth?: (width: number, minWidth?: number) => void
  width?: number
  tabIndex?: number
  navigateToCell?: () => void
  minWidth?: number
}

const smallStep = 10
const bigStep = 100

export default function ColumnResizer({ autoResize, forceWidth, width, tabIndex, navigateToCell, minWidth }: Props) {
  const [initialPointerState, setInitialPointerState] = useState<InitialPointerState | undefined>(undefined)
  const [activeKeyboard, setActiveKeyboard] = useState<boolean>(false)

  const autoResizeAndRemoveFocus = useCallback(() => {
    if (!initialPointerState) {
      // autoresize only if the pointer is inactive
      autoResize?.()
    }
    navigateToCell?.()
  }, [autoResize, navigateToCell, initialPointerState])

  // Disable click event propagation
  const disableOnClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle pointer down to start resizing
  const handlePointerDown = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    navigateToCell?.()
    event.stopPropagation()

    if (width === undefined) {
      // don't allow resizing if width is not set
      return
    }

    const { clientX, currentTarget, pointerId } = event
    setInitialPointerState({ clientX, pointerId, width })
    if (!('setPointerCapture' in currentTarget)) {
      // browserless unit tests don't support PointerEvents
      return
    }
    currentTarget.setPointerCapture(pointerId)
  }, [navigateToCell, width])

  // Handle pointer move event during resizing
  const handlePointerMove = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    if (!initialPointerState || event.pointerId !== initialPointerState.pointerId) {
      return
    }
    forceWidth?.(initialPointerState.width - initialPointerState.clientX + event.clientX, minWidth)
  }, [forceWidth, initialPointerState, minWidth])

  // Handle pointer up to end resizing
  const handlePointerUp = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    // releasePointerCapture() is called automatically on pointer up
    setInitialPointerState(state => {
      if (state && event.pointerId === state.pointerId) {
        // only reset the state if the pointer up is from the same pointer
        return undefined
      }
      return state
    })
  }, [])

  const onFocus = useCallback(() => {
    setActiveKeyboard(true)
  }, [])

  const onBlur = useCallback(() => {
    setActiveKeyboard(false)
  }, [])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (!activeKeyboard) {
      // let the event propagate to the parent
      return
    }
    if ([' ', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) {
      // prevent scrolling the table
      // Even if it's not implemented (no max width), End is blocked because a user might expect it to work.
      e.preventDefault()
    }
    e.stopPropagation()
    if (initialPointerState) {
      // don't allow keyboard events when resizing with the pointer
      return
    }
    if (e.key === 'Escape') {
      // cancel resizing and focus the parent cell
      setActiveKeyboard(false)
      navigateToCell?.()
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      // autoresize and exit keyboard mode
      autoResizeAndRemoveFocus()
      return
    }
    if (width === undefined) {
      // don't allow other keyboard events when width is not set
      return
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      forceWidth?.(width + smallStep)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      forceWidth?.(width - smallStep)
    } else if (e.key === 'PageUp') {
      forceWidth?.(width + bigStep)
    } else if (e.key === 'PageDown') {
      forceWidth?.(width - bigStep)
    } else if (e.key === 'Home') {
      // reset to 0 (it will be clamped to a minimum width)
      forceWidth?.(0)
    } // no 'End' key handling because the resizer has no max width
  }, [autoResizeAndRemoveFocus, initialPointerState, forceWidth, width, activeKeyboard, navigateToCell])

  const ariaBusy = initialPointerState !== undefined || activeKeyboard

  const ariaValueText = useMemo(() => {
    if (width === undefined) {
      return 'No width set.'
    }
    return `Width set to ${width} pixels.`
  }, [width])

  return (
    <span
      role="spinbutton"
      aria-orientation="vertical"
      aria-busy={ariaBusy}
      aria-valuemin={0}
      aria-valuenow={width}
      aria-valuetext={ariaValueText}
      // TODO(SL): use aria-labelledby and aria-describedby to allow translation
      aria-label="Resize column"
      aria-description='Press "Enter" or "Space" to autoresize the column (press again to unset the width). Press "Escape" to cancel resizing. Press "ArrowRight/ArrowUp" or "ArrowLeft/ArrowDown" to resize the column by 10 pixels. Press PageUp/PageDown to resize the column by 100 pixels.'
      onDoubleClick={autoResizeAndRemoveFocus}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={disableOnClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
    />
  )
}
