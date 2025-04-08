import { MouseEvent, ReactNode, useCallback, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { measureWidth } from '../../helpers/width.js'
import useColumnWidth from '../../hooks/useColumnWidth.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  children?: ReactNode
  dataReady?: boolean
  direction?: Direction
  onClick?: (e: MouseEvent) => void
  title?: string
  sortable?: boolean
  ariaPosInSet?: number // index of the column in the orderBy array (0-based)
  ariaSetSize?: number // size of the orderBy array
}

export default function ColumnHeader({ columnIndex, dataReady, direction, onClick, title, sortable, ariaPosInSet, ariaSetSize, children }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)

  // Get the column width from the context
  const { getColumnStyle, setColumnWidth, getColumnWidth } = useColumnWidth()
  const columnStyle = getColumnStyle?.(columnIndex)
  const width = getColumnWidth?.(columnIndex)
  const setWidth = useCallback((nextWidth: number | undefined) => {
    setColumnWidth?.({ columnIndex, width: nextWidth })
  }, [setColumnWidth, columnIndex])

  // Measure default column width when data is ready
  useEffect(() => {
    const element = ref.current
    if (dataReady && element) {
      const nextWidth = measureWidth(element)
      if (!isNaN(nextWidth)) {
        // should not happen in the browser (but fails in unit tests)
        setWidth(nextWidth)
      }
    }
  }, [dataReady, setWidth])

  const autoResize = useCallback(() => {
    const element = ref.current
    if (element) {
      // Remove the width, let it size naturally, and then measure it
      flushSync(() => {
        setWidth(undefined)
      })
      const nextWidth = measureWidth(element)
      // TODO(SL): take the ColumnResizer size into account, because if
      // the column title is larger than the cell values, the title is
      // truncated
      // TODO(SL): add a threshold to avoid resizing too small columns
      if (!isNaN(nextWidth)) {
        // should not happen in the browser (but fails in unit tests)
        setWidth(nextWidth)
      }
    }
  }, [setWidth])

  return (
    <th
      ref={ref}
      scope="col"
      role="columnheader"
      aria-sort={direction ?? 'none'}
      aria-disabled={!sortable}
      aria-posinset={ariaSetSize !== undefined ? ariaPosInSet : undefined}
      aria-setsize={ariaSetSize}
      onClick={onClick}
      style={columnStyle}
      title={title}
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
