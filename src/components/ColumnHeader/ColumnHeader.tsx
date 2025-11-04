import { KeyboardEvent, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'
import type { ColumnParameters } from '../../hooks/useColumnParameters.js'
import { Direction } from '../../helpers/sort.js'
import { getOffsetWidth } from '../../helpers/width.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import { useColumnMenu } from '../../hooks/useColumnMenu.js'
import { useColumnWidths } from '../../hooks/useColumnWidths.js'
import { useColumnVisibilityStates } from '../../hooks/useColumnVisibilityStates.js'
import { useOnCopy } from '../../hooks/useOnCopyToClipboard.js'
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
  const { sortable } = columnConfig
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
  const { getStyle, getDataFixedWidth, getWidth, setMeasuredWidth, setFixedWidth, releaseWidth } = useColumnWidths()
  const columnStyle = getStyle?.(columnIndex)
  const dataFixedWidth = getDataFixedWidth?.(columnIndex)
  const width = getWidth?.(columnIndex)

  const resizeTo = useCallback((value: number) => {
    setFixedWidth?.(columnIndex, value)
  }, [setFixedWidth, columnIndex])

  const tryToMeasureWidth = useCallback(() => {
    const element = ref.current
    if (canMeasureWidth && element && width === undefined && setMeasuredWidth) {
      const value = getOffsetWidth(element)
      if (isNaN(value)) {
        // browserless unit tests get NaN
        return
      }
      setMeasuredWidth(columnIndex, value)
    }
  }, [canMeasureWidth, setMeasuredWidth, width, columnIndex])

  // Measure default column width when data is ready, if no width is set
  useEffect(() => {
    tryToMeasureWidth()
  }, [tryToMeasureWidth])

  const autoResize = useCallback(() => {
    if (releaseWidth) {
      flushSync(() => {
        releaseWidth(columnIndex)
      })
      tryToMeasureWidth() // TODO(SL): remove and let the effect handle it?
    }
  }, [tryToMeasureWidth, releaseWidth, columnIndex])

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
  const handleCopy = useOnCopy(columnName)

  // Provide built-in controls for functional header overrides
  const controls = useMemo(() =>
    <div className="ht-header-controls">
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
    </div>
  , [isMenuEnabled, handleMenuClick, navigateToCell, tabIndex, isOpen, menuId, columnName])

  const headerContent = useMemo(() => {
    if (typeof columnConfig.headerComponent === 'function') {
      return columnConfig.headerComponent(controls)
    }
    return columnConfig.headerComponent ?? children
  }, [columnConfig, controls, children])

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
      onCopy={handleCopy}
      onKeyDown={onKeyDown}
      style={columnStyle}
      className={className}
      data-fixed-width={dataFixedWidth}
    >
      {headerContent}
      {typeof columnConfig.headerComponent === 'function' ? null :
        isMenuEnabled &&
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
        resizeTo={resizeTo}
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
