import { Dispatch, RefObject, SetStateAction, createRef, useEffect, useRef } from 'react'

// Same as react useState
type State<S> = [S, Dispatch<SetStateAction<S>>]

interface TableProps {
  header: string[]
  columnWidths: State<Array<number | undefined>>
  dataReady: boolean
}

const horizontalPadding = 10 // px

/**
 * Render a resizable header for a table.
 */
export default function TableHeader({ header, columnWidths, dataReady }: TableProps) {
  const [widths, setWidths] = columnWidths
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

  return <thead>
    <tr>
      <th><span /></th>
      {header.map((columnHeader, columnIndex) => (
        <th
          key={columnIndex}
          ref={headerRefs.current[columnIndex]}
          style={cellStyle(widths[columnIndex])}
          title={columnHeader}>
          {columnHeader}
        </th>
      ))}
    </tr>
  </thead>
}

export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}
