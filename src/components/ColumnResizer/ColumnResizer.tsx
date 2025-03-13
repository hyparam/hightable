import React from 'react'

interface Props {
  onDoubleClick?: () => void
  setResizeWidth?: (width?: number) => void
  setFinalWidth?: (width: number) => void
  width?: number
}

function ColumnResizer({ onDoubleClick, setFinalWidth, setResizeWidth, width }: Props) {
  const [resizeClientX, setResizeClientX] = React.useState<number | undefined>(undefined)

  // Handle mouse down to start resizing
  const onMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const nextResizeWidth = width ?? 0
    setResizeClientX(e.clientX - nextResizeWidth)
    setResizeWidth?.(nextResizeWidth)
  }, [setResizeWidth, width])

  // Handle mouse move event during resizing
  React.useEffect(() => {
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
  React.useEffect(() => {
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
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
    />
  )
}

export default ColumnResizer
