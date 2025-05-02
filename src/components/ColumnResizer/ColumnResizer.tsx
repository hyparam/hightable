import { MouseEvent, useCallback, useEffect, useState } from 'react'

interface Props {
  onDoubleClick?: () => void
  setWidth?: (width: number | undefined) => void
  width?: number
  tabIndex?: number
  navigateToCell?: () => void
}

export default function ColumnResizer({ onDoubleClick, setWidth, width, tabIndex, navigateToCell }: Props) {
  const [resizeClientX, setResizeClientX] = useState<number | undefined>(undefined)

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
          setWidth?.(Math.max(1, event.clientX - clientX))
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
          setWidth?.(Math.max(1, event.clientX - clientX))
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

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      aria-busy={resizeClientX !== undefined}
      // TODO: make it focusable + keyboard accessible and add aria properties (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/separator_role)
      // Note that aria-valuenow would be helpful for tests.
      onDoubleClick={handleDoubleClick}
      onMouseDown={onMouseDown}
      onClick={disableOnClick}
      tabIndex={tabIndex}
    />
  )
}
