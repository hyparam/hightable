import { Dispatch, RefObject, SetStateAction, createRef, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// Same as react useState
export type State<S> = [S, Dispatch<SetStateAction<S>>]

interface TableProps {
  header: string[]
  columnWidths: State<Array<number | undefined>>
  dataReady: boolean
}

const horizontalPadding = 10 // px

interface ResizingState {
  columnIndex: number
  clientX: number
}

/**
 * Render a resizable header for a table.
 */
export default function TableHeader({ header, columnWidths, dataReady }: TableProps) {
  const [widths, setWidths] = columnWidths
  const [resizing, setResizing] = useState<ResizingState | undefined>()
  const headerRefs = useRef(header.map(() => createRef<HTMLTableCellElement>()))

  function measureWidth(ref: RefObject<HTMLTableCellElement>) {
    return ref.current ? ref.current.offsetWidth - 2 * horizontalPadding : undefined
  }

  useEffect(() => {
    if (dataReady) {
      // Measure default column widths
      const widths = headerRefs.current.map(measureWidth)
      setWidths(widths)
    }
  }, [dataReady])

  // Modify column width
  function startResizing(columnIndex: number, clientX: number) {
    setResizing({
      columnIndex,
      clientX: clientX - (widths[columnIndex] || 0),
    })
  }

  // Function to handle double click for auto-resizing
  function autoResize(columnIndex: number) {
    // Remove the width, let it size naturally, and then measure it
    flushSync(() => {
      setWidths(widths => {
        const newWidths = [...widths]
        newWidths[columnIndex] = undefined
        return newWidths
      })
    })
    const newWidth = measureWidth(headerRefs.current[columnIndex])

    setWidths(widths => {
      const newWidths = [...widths]
      newWidths[columnIndex] = newWidth
      return newWidths
    })
  }

  // Attach mouse move and mouse up events for column resizing
  useEffect(() => {
    function stopResizing() {
      // save width to local storage
      if (!resizing) return
      setResizing(undefined)
    }

    // Handle mouse move event during resizing
    function handleMouseMove({ clientX }: MouseEvent) {
      if (resizing) {
        setWidths(widths => {
          // get mouse position relative to the column
          const newWidths = [...widths]
          newWidths[resizing.columnIndex] = Math.max(1, clientX - resizing.clientX)
          return newWidths
        })
      }
    }

    if (resizing) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', stopResizing)
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [header, resizing, widths, setWidths])

  return <thead>
    <tr>
      <th><span /></th>
      {header.map((columnHeader, columnIndex) =>
        <th
          key={columnIndex}
          ref={headerRefs.current[columnIndex]}
          style={cellStyle(widths[columnIndex])}
          title={columnHeader}>
          {columnHeader}
          <span
            onDoubleClick={() => autoResize(columnIndex)}
            onMouseDown={e => startResizing(columnIndex, e.clientX)} />
        </th>
      )}
    </tr>
  </thead>
}

export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}
