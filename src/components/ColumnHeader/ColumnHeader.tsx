import { KeyboardEvent, MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { measureWidth } from '../../helpers/width.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import useColumnWidth from '../../hooks/useColumnWidth.js'
import ColumnMenu from '../ColumnMenu/ColumnMenu.js'
import ColumnMenuButton from '../ColumnMenuButton/ColumnMenuButton.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  columnName: string
  children?: ReactNode
  dataReady?: boolean
  direction?: Direction
  onClick?: () => void
  sortable?: boolean
  orderByIndex?: number // index of the column in the orderBy array (0-based)
  orderBySize?: number // size of the orderBy array
  ariaColIndex: number // aria col index for the header
  ariaRowIndex: number // aria row index for the header
  className?: string // optional class name
  isColumnMenuOpen: boolean
  onToggleColumnMenu: (columnIndex: number) => void
}

export default function ColumnHeader({ columnIndex, columnName, dataReady, direction, onClick, sortable, orderByIndex, orderBySize, ariaColIndex, ariaRowIndex, className, children, isColumnMenuOpen, onToggleColumnMenu }: Props) {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const ref = useRef<HTMLTableCellElement>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback(() => {
    navigateToCell()
    onClick?.()
  }, [onClick, navigateToCell])

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

  const description = useMemo(() => {
    if (!sortable) {
      return `The column ${columnName} cannot be sorted`
    } else if (orderByIndex !== undefined && orderByIndex > 0) {
      return `Press to sort by ${columnName} in ascending order`
    } else if (direction === 'ascending') {
      return `Press to sort by ${columnName} in descending order`
    } else if (direction === 'descending') {
      return `Press to stop sorting by ${columnName}`
    } else {
      return `Press to sort by ${columnName} in ascending order`
    }
  }, [sortable, columnName, direction, orderByIndex])

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== ref.current) {
      // only handle keyboard events when the header is focused
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onClick?.()
    }
  }, [onClick])

  const handleColumnMenuClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      setPosition({
        left: e.clientX,
        top: rect.bottom,
      })
    }
    onToggleColumnMenu(columnIndex)
  }, [columnIndex, onToggleColumnMenu])

  return (
    <th
      ref={ref}
      scope="col"
      role="columnheader"
      aria-sort={direction ?? (sortable ? 'none' : undefined)}
      data-order-by-index={orderBySize !== undefined ? orderByIndex : undefined}
      data-order-by-size={orderBySize}
      aria-label={columnName}
      aria-description={description}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
      title={description}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      style={columnStyle}
      className={className}
    >
      {children}
      <ColumnResizer
        setWidth={setWidth}
        onDoubleClick={autoResize}
        width={width}
        tabIndex={tabIndex}
        navigateToCell={navigateToCell}
      />
      <ColumnMenuButton onClick={handleColumnMenuClick} />
      <ColumnMenu columnName={columnName} isVisible={isColumnMenuOpen} position={position} />
    </th>
  )
}
