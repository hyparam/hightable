import { MouseEvent, RefObject, createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { OrderBy, toggleColumn } from './sort'

interface TableProps {
  header: string[]
  cacheKey?: string // used to persist column widths
  columnWidths: (number | undefined)[]
  setColumnWidth: (columnIndex: number, columnWidth: number | undefined) => void
  setColumnWidths: (columnWidths: (number | undefined)[]) => void
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  dataReady: boolean
}

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
  header, cacheKey, columnWidths, orderBy, onOrderByChange, setColumnWidth, setColumnWidths, dataReady,
}: TableProps) {
  const [resizing, setResizing] = useState<ResizingState | undefined>()
  const headerRefs = useRef(header.map(() => createRef<HTMLTableCellElement>()))

  // Load persisted column widths
  useEffect(() => {
    const userWidths: (number|undefined)[] = new Array<number|undefined>(header.length).fill(undefined)
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
  }, [cacheKey, header, setColumnWidths])

  // Measure default column widths when data is ready
  useEffect(() => {
    if (dataReady) {
      const widths = headerRefs.current.map(measureWidth)
      setColumnWidths(widths)
    }
  }, [cacheKey, dataReady, header, setColumnWidths]) // re-measure if header changes

  // Modify column width
  const startResizing = useCallback((columnIndex: number, e: MouseEvent) => {
    e.stopPropagation()
    setResizing({
      columnIndex,
      clientX: e.clientX - (columnWidths[columnIndex] ?? 0),
    })
  }, [columnWidths])

  // Function to handle double click for auto-resizing
  const autoResize = useCallback((columnIndex: number) => {
    const columnName = header[columnIndex]
    if (columnName === undefined) {
      return
    }
    // Remove the width, let it size naturally, and then measure it
    flushSync(() => {
      setColumnWidth(columnIndex, undefined)
    })
    const headerRef = headerRefs.current[columnIndex]
    if (!headerRef) {
      // TODO: should we reset the previous width?
      // Note that it should not happen, since all the column headers should exist
      return
    }
    const newWidth = measureWidth(headerRef)

    if (cacheKey && newWidth) {
      saveColumnWidth(cacheKey, {
        columnIndex,
        columnName,
        width: newWidth,
      })
    }
    setColumnWidth(columnIndex, newWidth)
  }, [cacheKey, header, setColumnWidth])

  // Attach mouse move and mouse up events for column resizing
  useEffect(() => {
    function stopResizing() {
      // save width to local storage
      if (!resizing) return
      const { columnIndex } = resizing
      const columnName = header[columnIndex]
      const width = columnWidths[columnIndex]
      if (cacheKey && columnName !== undefined && width !== undefined) {
        saveColumnWidth(cacheKey, { columnIndex, columnName, width })
      }
      setResizing(undefined)
    }

    // Handle mouse move event during resizing
    function handleMouseMove({ clientX }: globalThis.MouseEvent) {
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
  }, [cacheKey, header, resizing, setColumnWidths, columnWidths, setColumnWidth])

  // Function to handle click for changing orderBy
  const getOnOrderByClick = useCallback((columnHeader: string) => {
    if (!onOrderByChange || !orderBy) return undefined
    return (e: MouseEvent) => {
      // Ignore clicks on resize handle
      if ((e.target as HTMLElement).tagName === 'SPAN') return
      const nextOrderBy = toggleColumn(columnHeader, orderBy)
      onOrderByChange(nextOrderBy)
    }}, [orderBy, onOrderByChange]
  )

  const directionByColumn = useMemo(() => {
    return new Map((orderBy ?? []).map(({ column, direction }) => [column, direction]))
  }, [orderBy])

  const memoizedStyles = useMemo(() => columnWidths.map(cellStyle), [columnWidths])

  return <thead role="rowgroup">
    <tr aria-rowindex={1} role="row">
      <td><span /></td>
      {header.map((columnHeader, columnIndex) => {
        const direction = directionByColumn.get(columnHeader)
        return (
          <th
            scope="col"
            role="columnheader"
            aria-sort={direction ?? 'none'}
            className={direction ? `orderby ${direction}` : undefined}
            key={columnIndex}
            onClick={getOnOrderByClick(columnHeader)}
            ref={headerRefs.current[columnIndex]}
            style={memoizedStyles[columnIndex]}
            title={columnHeader}>
            {columnHeader}
            <span
              onDoubleClick={() => { autoResize(columnIndex) }}
              onMouseDown={e => { startResizing(columnIndex, e) }} />
          </th>
        )})}
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
  return json ? JSON.parse(json) as ColumnWidth[] : []
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

function measureWidth(ref: RefObject<HTMLTableCellElement>): number | undefined {
  if (!ref.current) return undefined
  // get computed cell padding
  const style = window.getComputedStyle(ref.current)
  const horizontalPadding = parseInt(style.paddingLeft) + parseInt(style.paddingRight)
  return ref.current.offsetWidth - horizontalPadding
}
