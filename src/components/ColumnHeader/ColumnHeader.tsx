import { KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import type { ColumnParameters } from '../../hooks/useTableConfig.js'
import { Direction } from '../../helpers/sort.js'
import { getOffsetWidth } from '../../helpers/width.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import { useColumnMenu } from '../../hooks/useColumnMenu.js'
import { useColumnWidths } from '../../hooks/useColumnWidths.js'
import { useColumnVisibilityStates } from '../../hooks/useColumnVisibilityStates.js'
import ColumnMenu from '../ColumnMenu/ColumnMenu.js'
import ColumnMenuButton from '../ColumnMenuButton/ColumnMenuButton.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  columnName: string
  columnConfig: Omit<ColumnParameters, 'name' | 'index'> // column configuration, excluding name and index
  children?: ReactNode
  canMeasureWidth?: boolean
  direction?: Direction
  toggleOrderBy?: () => void
  orderByIndex?: number // index of the column in the orderBy array (0-based)
  orderBySize?: number // size of the orderBy array
  ariaColIndex: number // aria col index for the header
  ariaRowIndex: number // aria row index for the header
  className?: string // optional class name
}

export default function ColumnHeader({ columnIndex, columnName, columnConfig, canMeasureWidth, direction, toggleOrderBy, orderByIndex, orderBySize, ariaColIndex, ariaRowIndex, className, children }: Props) {
  const ref = useRef<HTMLTableCellElement | null>(null)
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const { sortable, headerComponent } = columnConfig
  const { isOpen, position, menuId, close, handleMenuClick } = useColumnMenu(ref, navigateToCell)
  const { getHideColumn, showAllColumns } = useColumnVisibilityStates()

  const handleClick = useCallback(() => {
    navigateToCell()
    if (sortable) toggleOrderBy?.()
  }, [toggleOrderBy, navigateToCell, sortable])

  const hideColumn = useMemo(() => {
    return getHideColumn?.(columnIndex)
  }, [getHideColumn, columnIndex])

  const isMenuEnabled = useMemo(() => {
    const hideMenu = !sortable && !hideColumn && !showAllColumns
    return !hideMenu
  }, [sortable, hideColumn, showAllColumns])

  // Get the column width from the context
  const { getColumnStyle, isFixedColumn, getColumnWidth, measureWidth, forceWidth, removeWidth } = useColumnWidths()
  const columnStyle = getColumnStyle?.(columnIndex)
  const dataFixedWidth = isFixedColumn?.(columnIndex) === true ? true : undefined
  const width = getColumnWidth?.(columnIndex)
  const forceColumnWidth = useCallback((width: number) => {
    forceWidth?.({ columnIndex, width, minWidth: columnConfig.minWidth })
  }, [forceWidth, columnIndex, columnConfig.minWidth])

  // Measure default column width when data is ready, if no width is set
  useEffect(() => {
    const element = ref.current
    if (canMeasureWidth && element && width === undefined) {
      const measured = getOffsetWidth(element)
      if (isNaN(measured)) {
        // browserless unit tests get NaN
        return
      }
      measureWidth?.({ columnIndex, measured })
    }
  }, [canMeasureWidth, measureWidth, width, columnIndex])

  const autoResize = useCallback(() => {
    const element = ref.current
    if (element && measureWidth && forceWidth && removeWidth) {
      // Remove the width, let it size naturally, and then measure it
      flushSync(() => {
        removeWidth({ columnIndex })
      })
      const measured = getOffsetWidth(element)
      if (isNaN(measured)) {
        // browserless unit tests get NaN
        return
      }
      if (dataFixedWidth && width === measured) {
        // If the width is already set and matches the measured width, toggle from fixed width to adjustable width
        measureWidth({ columnIndex, measured })
      } else {
        forceWidth({ columnIndex, width: measured })
      }

    }
  }, [measureWidth, forceWidth, removeWidth, columnIndex, dataFixedWidth, width])

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
      toggleOrderBy?.()
    }
  }, [toggleOrderBy])

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
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
      title={description}
      onClick={handleClick}
      onKeyDown={onKeyDown}
      style={columnStyle}
      className={className}
      data-fixed-width={dataFixedWidth}
    >
      {headerComponent ?? children}
      {isMenuEnabled &&
        <ColumnMenuButton
          onClick={handleMenuClick}
          onEscape={navigateToCell}
          tabIndex={tabIndex}
          isExpanded={isOpen}
          menuId={menuId}
          aria-label={`Column menu for ${columnName}`}
        />
      }
      <ColumnResizer
        forceWidth={forceColumnWidth}
        autoResize={autoResize}
        width={width}
        tabIndex={tabIndex}
        navigateToCell={navigateToCell}
      />
      <ColumnMenu
        columnName={columnName}
        isOpen={isOpen}
        position={position}
        direction={direction}
        sortable={sortable}
        toggleOrderBy={toggleOrderBy}
        hideColumn={hideColumn}
        showAllColumns={showAllColumns}
        close={close}
        id={menuId}
      />
    </th>
  )
}
