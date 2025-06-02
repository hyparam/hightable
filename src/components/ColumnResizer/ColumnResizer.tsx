import { KeyboardEvent, MouseEvent, PointerEvent, useCallback, useMemo, useState } from 'react'

interface PointerState {
  clientX: number
  width: number
  pointerId: number
}

interface Props {
  onDoubleClick?: () => void
  setWidth?: (width: number | undefined) => void
  width?: number
  tabIndex?: number
  navigateToCell?: () => void
}

const keyboardShiftWidth = 10
const minWidth = 1

export default function ColumnResizer({ onDoubleClick, setWidth, width, tabIndex, navigateToCell }: Props) {
  const [pointerState, setPointerState] = useState<PointerState | undefined>(undefined)
  const [activeKeyboard, setActiveKeyboard] = useState<boolean>(false)

  // Double click and mouse down/mouse up events must not conflict with each other.
  // This is done by updating the width on mouse down only when the width changes (dragging)
  // and by calling the onDoubleClick handler when the user double clicks only if the width is not being resized.

  const handleDoubleClick = useCallback(() => {
    navigateToCell?.()
    onDoubleClick?.()
  }, [onDoubleClick, navigateToCell])

  // Disable click event propagation
  const disableOnClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle pointer down to start resizing
  const handlePointerDown = useCallback((event: PointerEvent<HTMLSpanElement>) => {
    navigateToCell?.()
    event.stopPropagation()
    if (width === undefined) {
      // If width is not set, we cannot resize
      return
    }

    const { clientX, currentTarget, pointerId } = event
    setPointerState({
      clientX,
      width,
      pointerId,
    })
    currentTarget.setPointerCapture(pointerId)
  }, [navigateToCell, width])

  // Handle pointer move event during resizing
  const getOnPointerMove = useCallback(() => {
    if (!pointerState) {
      // no callback if pointer is not down
      return
    }
    const { clientX, width } = pointerState
    return (event: PointerEvent<HTMLSpanElement>) => {
      if (event.pointerId !== pointerState.pointerId) {
        // Ignore pointer events from other pointers
        return
      }
      const deltaX = event.clientX - clientX
      if (deltaX !== 0) {
        setWidth?.(Math.max(1, width + event.clientX - clientX))
        // TODO: send the delta, not the absolute width (increaseWidth)
      }
    }
  }, [pointerState, setWidth])

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
      setWidth?.(Math.max(minWidth, width + keyboardShiftWidth))
    } else if (e.key === 'ArrowLeft') {
      setWidth?.(Math.max(minWidth, width - keyboardShiftWidth))
    }
  }, [handleDoubleClick, pointerState, setWidth, width, activeKeyboard, navigateToCell])

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
