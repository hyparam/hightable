import { MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { measureWidth } from '../../helpers/width.js'
import useColumnWidth from '../../hooks/useColumnWidth.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'
import ColumnMenu from '../ColumnMenu/ColumnMenu.js'
import ColumnMenuButton from '../ColumnMenuButton/ColumnMenuButton.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  columnName: string
  children?: ReactNode
  dataReady?: boolean
  direction?: Direction
  onClick?: (e: MouseEvent) => void
  onHideColumn?: (columnIndex: number) => void
  onShowAllColumns?: () => void
  title?: string
  sortable?: boolean
  orderByIndex?: number // index of the column in the orderBy array (0-based)
  orderBySize?: number // size of the orderBy array
  className?: string // optional class name
  visibleHeader?: string[] // list of visible column headers
}

export default function ColumnHeader({
  orderByIndex,
  orderBySize,
  columnIndex,
  columnName,
  dataReady,
  direction,
  onClick,
  onHideColumn,
  onShowAllColumns,
  sortable,
  className,
  children,
  title,
  visibleHeader = [],
}: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 })

  // Get the column width from the context
  const { getColumnStyle, setColumnWidth, getColumnWidth } = useColumnWidth()
  const columnStyle = getColumnStyle?.(columnIndex)
  const width = getColumnWidth?.(columnIndex)
  const setWidth = useCallback(
    (nextWidth: number | undefined) => {
      setColumnWidth?.({ columnIndex, width: nextWidth })
    },
    [setColumnWidth, columnIndex]
  )

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

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setMenuPosition({
      x: e.clientX,
      y: e.clientY,
    })
    setShowMenu(true)
  }, [])

  const closeMenu = useCallback(() => {
    setShowMenu(false)
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    if (showMenu) {
      function handleClickOutside() {
        setShowMenu(false)
      }

      document.addEventListener('click', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
      }
    }
  }, [showMenu])

  // Handle menu button click
  const handleMenuButtonClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
    const rect = ref.current?.getBoundingClientRect()
    if (rect) {
      setMenuPosition({
        x: e.clientX,
        y: rect.bottom,
      })
      setShowMenu(true)
    }
  }, [])

  const handleSort = useCallback((_colIndex: number, sortDirection: Direction | null) => {
    if (onClick) {
      // Create a synthetic event with sort direction for TableHeader
      const event = {} as MouseEvent & { sortDirection: typeof sortDirection }
      event.sortDirection = sortDirection
      onClick(event)
    }
  }, [onClick])

  function renderColumnMenu() {
    // We know columns are hidden if the onShowAllColumns callback is provided
    const hasHiddenColumns = Boolean(onShowAllColumns)

    return (
      <ColumnMenu
        column={title ?? columnName}
        columnIndex={columnIndex}
        onHideColumn={onHideColumn}
        onShowAllColumns={onShowAllColumns}
        hasHiddenColumns={hasHiddenColumns}
        sortable={sortable}
        direction={direction}
        onSort={handleSort}
        isVisible={showMenu}
        position={menuPosition}
        onClose={closeMenu}
        visibleHeader={visibleHeader}
      />
    )
  }

  return (
    <>
      <th
        ref={ref}
        scope="col"
        role="columnheader"
        aria-sort={direction ?? (sortable ? 'none' : undefined)}
        data-order-by-index={orderBySize !== undefined ? orderByIndex : undefined}
        data-order-by-size={orderBySize}
        aria-description={description}
        // 1-based index, +1 for the row header
        // TODO(SL): don't hardcode it, but get it from the table context
        aria-colindex={columnIndex + 2}
        title={description}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        style={{ ...columnStyle, position: 'relative' }}
        className={className}
        aria-label={title ?? columnName}
      >
        <span>
          {children}
        </span>
        <ColumnMenuButton onClick={handleMenuButtonClick} />
        <ColumnResizer setWidth={setWidth} onDoubleClick={autoResize} width={width} />
      </th>
      {/* ColumnMenu is rendered via portal to document.body */}
      {renderColumnMenu()}
    </>
  )
}
