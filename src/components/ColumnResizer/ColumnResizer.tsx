import { KeyboardEvent, MouseEvent, PointerEvent, useCallback, useMemo, useState } from 'react'

interface PointerState {
  clientX: number
  pointerId: number
}

interface Props {
  onDoubleClick?: () => void
  increaseWidth?: (delta: number) => void
  width?: number
  tabIndex?: number
  navigateToCell?: () => void
}

const keyboardShiftWidth = 10
const minWidth = 1

export default function ColumnResizer({ onDoubleClick, increaseWidth, width, tabIndex, navigateToCell }: Props) {
  const [pointerState, setPointerState] = useState<PointerState | undefined>(undefined)
  const [activeKeyboard, setActiveKeyboard] = useState<boolean>(false)

  const handleDoubleClick = useCallback(() => {
    navigateToCell?.()
    if (pointerState) {
      // If pointer is down, we are resizing, so don't call onDoubleClick
      return
    }
    onDoubleClick?.()
  }, [onDoubleClick, navigateToCell, pointerState])

  // Disable click event propagation
  const disableOnClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle pointer down to start resizing
  const handlePointerDown = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    navigateToCell?.()
    event.stopPropagation()

    const { clientX, currentTarget, pointerId } = event
    setPointerState({ clientX, pointerId })
    if (!('setPointerCapture' in currentTarget)) {
      // browserless unit tests don't support PointerEvents
      return
    }
    currentTarget.setPointerCapture(pointerId)
  }, [navigateToCell])

  // Handle pointer move event during resizing
  const getOnPointerMove = useCallback(() => {
    if (!pointerState) {
      // no callback if pointer is not down
      return
    }
    const { clientX: previousClientX } = pointerState
    return (event: PointerEvent<HTMLSpanElement>) => {
      const { pointerId, clientX } = event
      if (event.pointerId !== pointerState.pointerId) {
        // Ignore pointer events from other pointers
        return
      }
      const delta = clientX - previousClientX
      if (delta !== 0) {
        increaseWidth?.(delta)
        setPointerState({ clientX, pointerId })
      }
    }
  }, [pointerState, increaseWidth])

  // Handle pointer up to end resizing
  const handlePointerUp = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    event.stopPropagation()
    // releasePointerCapture() is called automatically on pointer up
    setPointerState(undefined)
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
    if ([' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) {
      // prevent scrolling the table
      e.preventDefault()
    }
    e.stopPropagation()
    if (pointerState) {
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
      handleDoubleClick()
      return
    }
    if (width === undefined) {
      // don't allow other keyboard events when width is not set
      return
    }
    if (e.key === 'ArrowRight') {
      increaseWidth?.(keyboardShiftWidth)
    } else if (e.key === 'ArrowLeft') {
      increaseWidth?.(-keyboardShiftWidth)
    }
  }, [handleDoubleClick, pointerState, increaseWidth, width, activeKeyboard, navigateToCell])

  const ariaBusy = pointerState !== undefined || activeKeyboard

  const ariaValueText = useMemo(() => {
    if (width === undefined) {
      return 'No width set.'
    }
    return `Width set to ${width} pixels.`
  }, [width])

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-busy={ariaBusy}
      aria-valuemin={minWidth}
      aria-valuenow={width}
      aria-valuetext={ariaValueText}
      // TODO: use aria-labelledby and aria-describedby to allow translation
      aria-label="Resize column"
      aria-description='Press "Enter" or "Space" to autoresize the column. Press "Escape" to cancel resizing. Press "ArrowRight" or "ArrowLeft" to resize the column by 10 pixels.'
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={getOnPointerMove()}
      onPointerUp={handlePointerUp}
      onClick={disableOnClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
    />
  )
}
