import { KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useState } from 'react'

interface Props {
  onDoubleClick?: () => void
  setWidth?: (width: number | undefined) => void
  width?: number
  tabIndex?: number
  navigateToCell?: () => void
}

const keyboardShiftWidth = 10

// TODO: add aria-minwidth and aria-maxwidth?
export default function ColumnResizer({ onDoubleClick, setWidth, width, tabIndex, navigateToCell }: Props) {
  const [resizeClientX, setResizeClientX] = useState<number | undefined>(undefined)
  const [activeKeyboard, setActiveKeyboard] = useState<boolean>(false)

  const handleDoubleClick = useCallback(() => {
    navigateToCell?.()
    onDoubleClick?.()
  }, [onDoubleClick, navigateToCell])

  // Disable click event propagation
  const disableOnClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle mouse down to start resizing
  const onMouseDown = useCallback((e: MouseEvent) => {
    navigateToCell?.()
    e.stopPropagation()
    const nextResizeWidth = width ?? 0
    setResizeClientX(e.clientX - nextResizeWidth)
    setWidth?.(nextResizeWidth)
  }, [setWidth, width, navigateToCell])

  // Handle mouse move event during resizing
  useEffect(() => {
    if (resizeClientX !== undefined) {
      function updateResizeWidth(clientX: number) {
        return function(event: globalThis.MouseEvent) {
          setWidth?.(event.clientX - clientX)
        }
      }
      const listener = updateResizeWidth(resizeClientX)
      window.addEventListener('mousemove', listener)
      return () => {
        window.removeEventListener('mousemove', listener)
      }
    }
  }, [resizeClientX, setWidth])

  // Handle mouse up to end resizing
  useEffect(() => {
    if (resizeClientX !== undefined) {
      function stopResizing(clientX: number) {
        return function(event: globalThis.MouseEvent) {
          setWidth?.(event.clientX - clientX)
          setResizeClientX(undefined)
        }
      }
      const listener = stopResizing(resizeClientX)
      window.addEventListener('mouseup', listener)
      return () => {
        window.removeEventListener('mouseup', listener)
      }
    }
  }, [resizeClientX, setWidth])

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
    if (resizeClientX !== undefined) {
      // don't allow keyboard events when resizing with the mouse
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
      setWidth?.(width + keyboardShiftWidth)
    } else if (e.key === 'ArrowLeft') {
      setWidth?.(width - keyboardShiftWidth)
    }
  }, [handleDoubleClick, resizeClientX, setWidth, width, activeKeyboard, navigateToCell])

  const ariaBusy = resizeClientX !== undefined || activeKeyboard

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
      aria-valuenow={width}
      aria-valuetext={ariaValueText}
      // TODO: use aria-labelledby and aria-describedby to allow translation
      aria-label="Resize column"
      aria-description='Press "Enter" or "Space" to autoresize the column. Press "Escape" to cancel resizing. Press "ArrowRight" or "ArrowLeft" to resize the column by 10 pixels.'
      onDoubleClick={handleDoubleClick}
      onMouseDown={onMouseDown}
      onClick={disableOnClick}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
    />
  )
}
