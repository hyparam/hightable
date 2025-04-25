import { MouseEvent, ReactNode, useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { measureWidth } from '../../helpers/width.js'
import useColumnWidth from '../../hooks/useColumnWidth.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  columnName: string
  children?: ReactNode
  dataReady?: boolean
  direction?: Direction
  onClick?: (e: MouseEvent) => void
  sortable?: boolean
  ariaPosInSet?: number // index of the column in the orderBy array (0-based)
  ariaSetSize?: number // size of the orderBy array
  className?: string // optional class name
}

function getActionFromOrderByColumn({ columnName, direction, ariaPosInSet }: { columnName: string; direction?: Direction, ariaPosInSet?: number }) {
  let prefix = 'Press to '
  if (ariaPosInSet !== undefined && ariaPosInSet > 0) {
    prefix += `sort by ${columnName} in ascending order`
  } else if (direction === 'ascending') {
    prefix += `sort by ${columnName} in descending order`
  } else if (direction === 'descending') {
    prefix += `stop sorting by ${columnName}`
  } else {
    prefix += `sort by ${columnName} in ascending order`
  }
  return prefix
}

export default function ColumnHeader({ columnIndex, columnName, dataReady, direction, onClick, sortable, ariaPosInSet, ariaSetSize, className, children }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)

  // Get the column width from the context
  const { getColumnStyle, setColumnWidth, getColumnWidth } = useColumnWidth()
  const columnStyle = getColumnStyle?.(columnIndex)
  const width = getColumnWidth?.(columnIndex)
  const setWidth = useCallback((nextWidth: number | undefined) => {
    setColumnWidth?.({ columnIndex, width: nextWidth })
  }, [setColumnWidth, columnIndex])

  // Measure default column width when data is ready, if no width is set
  useEffect(() => {
    const element = ref.current
    if (dataReady && element && width === undefined) {
      const nextWidth = measureWidth(element)
      if (!isNaN(nextWidth)) {
        // should not happen in the browser (but fails in unit tests)
        setWidth(nextWidth)
      }
    }
  }, [dataReady, setWidth, width])

  const autoResize = useCallback(() => {
    const element = ref.current
    if (element) {
      // Remove the width, let it size naturally, and then measure it
      flushSync(() => {
        setWidth(undefined)
      })
      const nextWidth = measureWidth(element)
      if (!isNaN(nextWidth)) {
        // should not happen in the browser (but fails in unit tests)
        setWidth(nextWidth)
      }
    }
  }, [setWidth])

  const description = sortable ? getActionFromOrderByColumn({ columnName, direction, ariaPosInSet }) : `The column ${columnName} cannot be sorted`

  return (
    <th
      ref={ref}
      scope="col"
      role="columnheader"
      aria-sort={direction ?? (sortable ? 'none' : undefined)}
      aria-description={description}
      title={description}
      aria-posinset={ariaSetSize !== undefined ? ariaPosInSet : undefined}
      aria-setsize={ariaSetSize}
      onClick={onClick}
      style={columnStyle}
      className={className}
    >
      {children}
      <ColumnResizer
        setWidth={setWidth}
        onDoubleClick={autoResize}
        width={width}
      />
    </th>
  )
}
