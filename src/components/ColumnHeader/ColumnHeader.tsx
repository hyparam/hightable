import type { KeyboardEvent, ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import { flushSync } from 'react-dom'

import { ColumnsVisibilityContext } from '../../contexts/ColumnsVisibilityContext.js'
import { ColumnWidthsContext } from '../../contexts/ColumnWidthsContext.js'
import { SortInfoAndActionsByColumnContext } from '../../contexts/OrderByContext.js'
import type { ColumnConfig } from '../../helpers/columnConfiguration.js'
import { getOffsetWidth } from '../../helpers/width.js'
import { useCellFocus } from '../../hooks/useCellFocus.js'
import { useColumnMenu } from '../../hooks/useColumnMenu.js'
import { useOnCopy } from '../../hooks/useOnCopyToClipboard.js'
import type { AriaSort } from '../ColumnMenu/ColumnMenu.js'
import ColumnMenu from '../ColumnMenu/ColumnMenu.js'
import ColumnMenuButton from '../ColumnMenuButton/ColumnMenuButton.js'
import ColumnResizer from '../ColumnResizer/ColumnResizer.js'

interface Props {
  columnIndex: number // index of the column in the dataframe (0-based)
  columnName: string
  columnConfig: ColumnConfig
  children?: ReactNode
  canMeasureWidth?: boolean
  ariaColIndex: number // aria col index for the header
  ariaRowIndex: number // aria row index for the header
  className?: string // optional class name
}

function useSortInformation(columnName: string) {
  const sortInfoAndActionsByColumn = useContext(SortInfoAndActionsByColumnContext)

  const columnInfo = sortInfoAndActionsByColumn.get(columnName)

  if (!columnInfo) {
    // the column is not sortable, so we don't show any sortIndicator
    // all the fields are undefined, apart from sortDescription
    return { sortDescription: `The column ${columnName} cannot be sorted` }
  }

  const { sortInfo, toggleOrderBy } = columnInfo
  const ariaSort: AriaSort = sortInfo?.direction ?? 'none' as const
  const sortDescription = toggleOrderBy === undefined
    ? `The column ${columnName} order is read-only`
    : sortInfo === undefined || sortInfo.index > 0
      ? `Press to sort by ${columnName} in ascending order`
      : sortInfo.direction === 'ascending'
        ? `Press to sort by ${columnName} in descending order.`
        : `Press to stop sorting by ${columnName}` // direction is descending
  const sortIndicator = sortInfo?.direction === 'ascending'
    ? '⭡'
    : sortInfo?.direction === 'descending'
      ? '⭣'
      : toggleOrderBy !== undefined
        ? '⇅'
        : '' // the column might be sorted later, so we reserve the space for the indicator to avoid layout shift when sorting
  return { ariaSort, orderByIndex: sortInfo?.index, sortDescription, sortIndicator, toggleOrderBy }
}
export default function ColumnHeader({ columnIndex, columnName, columnConfig, canMeasureWidth, ariaColIndex, ariaRowIndex, className, children }: Props) {
  // The ref is used to position the menu in handleMenuClick, to measure width, and to focus the cell
  const ref = useRef<HTMLTableCellElement | null>(null)
  const { tabIndex, navigateToCell, focusIfNeeded } = useCellFocus({ ariaColIndex, ariaRowIndex })
  const { isOpen, position, menuId, close, handleMenuClick } = useColumnMenu(ref, navigateToCell)
  const { getHideColumn, showAllColumns } = useContext(ColumnsVisibilityContext)

  // Sorting
  const { ariaSort, orderByIndex, sortDescription, sortIndicator, toggleOrderBy } = useSortInformation(columnName)

  // Focus the cell if needed. We use an effect, as it acts on the DOM element after render.
  useEffect(() => {
    focusIfNeeded?.(ref.current)
  }, [focusIfNeeded])

  const handleClick = useCallback(() => {
    navigateToCell?.()
    toggleOrderBy?.()
  }, [toggleOrderBy, navigateToCell])

  const hideColumn = useMemo(() => {
    return getHideColumn?.(columnName)
  }, [getHideColumn, columnName])

  const isMenuEnabled = useMemo(() => {
    const hasCustomMenuGroups = columnConfig.menuGroups && columnConfig.menuGroups.length > 0
    const hideMenu = !ariaSort && !hideColumn && !showAllColumns && !hasCustomMenuGroups
    return !hideMenu
  }, [ariaSort, hideColumn, showAllColumns, columnConfig.menuGroups])

  // Get the column width from the context
  const { getStyle, getDataFixedWidth, getWidth, setMeasuredWidth, setFixedWidth, releaseWidth } = useContext(ColumnWidthsContext)
  const columnStyle = getStyle?.(columnIndex)
  const dataFixedWidth = getDataFixedWidth?.(columnIndex)
  const width = getWidth?.(columnIndex)

  const resizeTo = useCallback((value: number) => {
    setFixedWidth?.(columnIndex, value)
  }, [setFixedWidth, columnIndex])

  const tryToMeasureWidth = useCallback(() => {
    const element = ref.current
    if (canMeasureWidth && element && width === undefined && setMeasuredWidth) {
      // use offsetWidth, not clientWidth, to include borders
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

  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target !== ref.current || !toggleOrderBy) {
      // only handle keyboard events when the header is focused, the column is sortable and can be toggled
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      toggleOrderBy()
    }
  }, [toggleOrderBy])
  const handleCopy = useOnCopy(columnName)

  // If the hightable user provides a custom header component, they can choose where to place these controls inside it
  const controls = useMemo(() => (
    <div role="group">
      {sortIndicator
        && (
          <span role="img" aria-hidden="true">{sortIndicator}</span>
        )}
      {isMenuEnabled
        && (
          <ColumnMenuButton
            onClick={handleMenuClick}
            onEscape={navigateToCell}
            tabIndex={tabIndex}
            isExpanded={isOpen}
            menuId={menuId}
            aria-label={`Column menu for ${columnName}`}
          />
        )}
    </div>
  ),
  [isMenuEnabled, handleMenuClick, navigateToCell, tabIndex, isOpen, menuId, columnName, sortIndicator])

  const headerContent = useMemo(() => {
    const { headerComponent } = columnConfig
    if (typeof headerComponent === 'function') {
      return headerComponent(controls)
    }
    return headerComponent ?? children
  }, [columnConfig, controls, children])

  const isFunctionalHeader = useMemo(() => typeof columnConfig.headerComponent === 'function', [columnConfig])

  return (
    <th
      ref={ref}
      scope="col"
      role="columnheader"
      aria-sort={ariaSort}
      data-can-sort={toggleOrderBy === undefined ? undefined : 'true'}
      data-order-by-index={orderByIndex}
      data-functional-header={isFunctionalHeader ? 'true' : undefined}
      aria-label={columnName}
      aria-description={sortDescription}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      tabIndex={tabIndex}
      title={sortDescription}
      onClick={handleClick}
      onCopy={handleCopy}
      onKeyDown={onKeyDown}
      style={columnStyle}
      className={className}
      data-fixed-width={dataFixedWidth}
    >
      {headerContent}
      {isFunctionalHeader
        ? null
        : isMenuEnabled
          && (
            <ColumnMenuButton
              onClick={handleMenuClick}
              onEscape={navigateToCell}
              tabIndex={tabIndex}
              isExpanded={isOpen}
              menuId={menuId}
              aria-label={`Column menu for ${columnName}`}
            />
          )}
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
        ariaSort={ariaSort}
        toggleOrderBy={toggleOrderBy}
        hideColumn={hideColumn}
        showAllColumns={showAllColumns}
        close={close}
        id={menuId}
        menuGroups={columnConfig.menuGroups}
      />
    </th>
  )
}
