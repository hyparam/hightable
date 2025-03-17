import { MouseEvent, useCallback, useEffect, useState } from 'react'

interface Props {
  onDoubleClick?: () => void
  setResizeWidth?: (width?: number) => void
  setFinalWidth?: (width: number) => void
  width?: number
}

export default function ColumnResizer({ onDoubleClick, setFinalWidth, setResizeWidth, width }: Props) {
  const [resizeClientX, setResizeClientX] = useState<number | undefined>(undefined)

  // Disable click event propagation
  const disableOnClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle mouse down to start resizing
  const onMouseDown = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    const nextResizeWidth = width ?? 0
    setResizeClientX(e.clientX - nextResizeWidth)
    setResizeWidth?.(nextResizeWidth)
  }, [setResizeWidth, width])

  // Handle mouse move event during resizing
  useEffect(() => {
    if (resizeClientX !== undefined) {
      function updateResizeWidth(clientX: number) {
        return function(event: globalThis.MouseEvent) {
          setResizeWidth?.(Math.max(1, event.clientX - clientX))
        }
      }
      const listener = updateResizeWidth(resizeClientX)
      window.addEventListener('mousemove', listener)
      return () => {
        window.removeEventListener('mousemove', listener)
      }
    }
  }, [resizeClientX, setResizeWidth])

  // Handle mouse up to end resizing
  useEffect(() => {
    if (resizeClientX !== undefined) {
      function stopResizing(clientX: number) {
        return function(event: globalThis.MouseEvent) {
          setFinalWidth?.(Math.max(1, event.clientX - clientX))
          setResizeWidth?.(undefined)
          setResizeClientX(undefined)
        }
      }
      const listener = stopResizing(resizeClientX)
      window.addEventListener('mouseup', listener)
      return () => {
        window.removeEventListener('mouseup', listener)
      }
    }
  }, [resizeClientX, setFinalWidth, setResizeWidth])

  return (
    <span
      role="separator"
      aria-orientation="vertical"
      // TODO: make it focusable + keyboard accessible and add aria properties (https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/separator_role)
      // Note that aria-valuenow would be helpful for tests.
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      onClick={disableOnClick}
    />
  )
}
