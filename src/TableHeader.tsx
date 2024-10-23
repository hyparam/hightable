import { RefObject, createRef, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

interface TableProps {
  header: string[]
  cacheKey?: string // used to persist column widths
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
 * Save column sizes per file in local storage.
 *
 * Considerations:
 * - File contents can change, so column sizes are saved by name.
 * - There could be duplicate column names.
 */
export interface ColumnWidth {
  columnIndex: number
  columnName: string
  width: number
}

/**
 * Render a resizable header for a table.
 */
export default function TableHeader({
  header, cacheKey, columnWidths, orderBy, setOrderBy, setColumnWidth, setColumnWidths, dataReady
}: TableProps) {
  const [resizing, setResizing] = useState<ResizingState | undefined>()
  const headerRefs = useRef(header.map(() => createRef<HTMLTableCellElement>()))

  function measureWidth(ref: RefObject<HTMLTableCellElement>) {
    return ref.current ? ref.current.offsetWidth - 2 * horizontalPadding : undefined
  }

  // Load persisted column widths
  useEffect(() => {
    const userWidths: number[] = new Array(header.length)
    if (cacheKey) {
      // load user sized column widths
      loadColumnWidths(cacheKey).forEach(({ columnIndex, columnName, width }) => {
        // use saved width, if column index and name match
        if (header[columnIndex] === columnName) {
          userWidths[columnIndex] = width
        }
      })
    }
    setColumnWidths(userWidths)
  }, [cacheKey])

  // Measure default column widths when data is ready
  useEffect(() => {
    if (dataReady) {
      const widths = headerRefs.current.map(measureWidth)
      setColumnWidths(widths)
    }
  }, [cacheKey, dataReady, header]) // re-measure if header changes

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

    if (cacheKey && newWidth) {
      saveColumnWidth(cacheKey, {
        columnIndex,
        columnName: header[columnIndex],
        width: newWidth,
      })
    }
    setColumnWidth(columnIndex, newWidth)
  }

  // Attach mouse move and mouse up events for column resizing
  useEffect(() => {
    function stopResizing() {
      // save width to local storage
      if (!resizing) return
      const { columnIndex } = resizing
      if (cacheKey && columnWidths[columnIndex]) {
        const width = columnWidths[columnIndex]!
        saveColumnWidth(cacheKey, {
          columnIndex,
          columnName: header[columnIndex],
          width,
        })
      }
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
  }, [cacheKey, header, resizing, setColumnWidths])

  // Function to handle click for changing orderBy
  function handleOrderByClick(columnHeader: string, e: React.MouseEvent) {
    // Ignore clicks on resize handle
    if ((e.target as HTMLElement).tagName === 'SPAN') return
    if (orderBy === columnHeader) {
      setOrderBy?.(undefined)
    } else {
      setOrderBy?.(columnHeader)
    }
  }

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])

  return <thead>
    <tr>
      <th><span /></th>
      {header.map((columnHeader, columnIndex) =>
        <th
          aria-sort={orderBy === columnHeader ? 'ascending' : undefined}
          className={orderBy === columnHeader ? 'orderby' : undefined}
          key={columnIndex}
          onClick={e => handleOrderByClick(columnHeader, e)}
          ref={headerRefs.current[columnIndex]}
          style={memoizedStyles[columnIndex]}
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

/**
 * Get column sizes from local storage for a key.
 */
export function loadColumnWidths(key: string): ColumnWidth[] {
  const json = localStorage.getItem(`column-widths:${key}`)
  return json ? JSON.parse(json) : []
}

/**
 * Set column sizes in local storage for a key.
 */
export function saveColumnWidth(key: string, columnWidth: ColumnWidth) {
  const widths = [
    ...loadColumnWidths(key).filter(cw => cw.columnIndex !== columnWidth.columnIndex),
    columnWidth,
  ]
  localStorage.setItem(`column-widths:${key}`, JSON.stringify(widths))
}
