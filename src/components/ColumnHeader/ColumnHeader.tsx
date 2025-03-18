import { MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { cellStyle, measureWidth } from '../../helpers/width.js'
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  children?: ReactNode
  dataReady?: boolean
  direction?: Direction
  localStorageKey?: string
  onClick?: (e: MouseEvent) => void
  title?: string
}

export default function ColumnHeader({ children, dataReady, direction, localStorageKey, onClick, title }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const [width, setWidth] = useLocalStorageState<number>({ key: localStorageKey ? `${localStorageKey}:width` : undefined })
  const [resizeWidth, setResizeWidth] = useState<number | undefined>(undefined)
  const currentWidth = resizeWidth ?? width

  const style = useMemo(() => {
    return cellStyle(currentWidth)
  }, [currentWidth])

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
      onClick={onClick}
      style={style}
      title={title}
    >
      {children}
      <ColumnResizer
        setFinalWidth={setWidth}
        setResizeWidth={setResizeWidth}
        onDoubleClick={autoResize}
        width={width}
      />
    </th>
  )
}
