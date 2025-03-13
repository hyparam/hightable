import React from 'react'
import ReactDOM from 'react-dom'
import { cellStyle } from '../../helpers/cellStyle.js'
import { Direction } from '../../helpers/sort.js'
import { useLocalStorageState } from '../../hooks/useLocalStorageState.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'
import { measureWidth } from './ColumnHeader.helpers.js'

interface Props {
  children?: React.ReactNode
  dataReady?: boolean
  direction?: Direction
  localStorageKey?: string
  onClick?: (e: React.MouseEvent) => void
  title?: string
}

function ColumnHeader({ children, dataReady, direction, localStorageKey, onClick, title }: Props) {
  const ref = React.useRef<HTMLTableCellElement>(null)
  const [width, setWidth] = useLocalStorageState<number>({ key: localStorageKey ? `${localStorageKey}:width` : undefined })
  const [resizeWidth, setResizeWidth] = React.useState<number | undefined>(undefined)
  const currentWidth = resizeWidth ?? width

  const style = React.useMemo(() => {
    return cellStyle(currentWidth)
  }, [currentWidth])

  // Measure default column width when data is ready
  React.useEffect(() => {
    const element = ref.current
    if (dataReady && element) {
      setWidth(measureWidth(element))
    }
  }, [dataReady, setWidth])

  const autoResize = React.useCallback(() => {
    const element = ref.current
    if (element) {
      // Remove the width, let it size naturally, and then measure it
      ReactDOM.flushSync(() => {
        setWidth(undefined)
      })
      setWidth(measureWidth(element))
    }
  }, [setWidth])

  return (
    <th
      ref={ref}
      scope="col"
      role="columnheader"
      aria-sort={direction ?? 'none'}
      className={direction ? `orderby ${direction}` : undefined}
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

export default ColumnHeader
