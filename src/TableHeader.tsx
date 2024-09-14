import { RefObject, createRef, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface TableProps {
  header: string[]
  columnWidths: Array<number | undefined>
  orderBy?: string | undefined
  setColumnWidth: (columnIndex: number, columnWidth: number | undefined) => void
  setColumnWidths: (columnWidths: Array<number | undefined>) => void
  setOrderBy?: (orderBy: string | undefined) => void
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
export default function TableHeader({ header, columnWidths, orderBy, setColumnWidth, setColumnWidths, setOrderBy, dataReady }: TableProps) {
  const [resizing, setResizing] = useState<ResizingState | undefined>()
  const headerRefs = useRef(header.map(() => createRef<HTMLTableCellElement>()))

  function measureWidth(ref: RefObject<HTMLTableCellElement>) {
    return ref.current ? ref.current.offsetWidth - 2 * horizontalPadding : undefined
  }

  useEffect(() => {
    if (dataReady) {
      // Measure default column widths
      const widths = headerRefs.current.map(measureWidth)
      setColumnWidths(widths)
    }
  }, [dataReady])

  // Modify column width
  function startResizing(columnIndex: number, e: React.MouseEvent<HTMLSpanElement, MouseEvent>) {
    e.stopPropagation()
    setResizing({
      columnIndex,
      clientX: e.clientX - (columnWidths[columnIndex] || 0),
    })
  }

  // Function to handle double click for auto-resizing
  function autoResize(columnIndex: number) {
    // Remove the width, let it size naturally, and then measure it
    flushSync(() => {
      setColumnWidth(columnIndex, undefined)
    })
    const newWidth = measureWidth(headerRefs.current[columnIndex])
    setColumnWidth(columnIndex, newWidth)
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
        setColumnWidth(resizing.columnIndex, Math.max(1, clientX - resizing.clientX))
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
  }, [header, resizing, setColumnWidths])

  // Function to handle click for changing orderBy
  function handleOrderByClick(columnHeader: string) {
    if (orderBy === columnHeader) {
      setOrderBy?.(undefined)
    } else {
      setOrderBy?.(columnHeader)
    }
  }

  return <thead>
    <tr>
      <th><span /></th>
      {header.map((columnHeader, columnIndex) =>
        <th
          className={orderBy === columnHeader ? 'orderby' : undefined}
          key={columnIndex}
          onClick={() => handleOrderByClick(columnHeader)}
          ref={headerRefs.current[columnIndex]}
          style={cellStyle(columnWidths[columnIndex])}
          title={columnHeader}>
          {columnHeader}
          <span
            onDoubleClick={() => autoResize(columnIndex)}
            onMouseDown={e => startResizing(columnIndex, e)} />
        </th>
      )}
    </tr>
  </thead>
}

export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}
