import { useCallback, useMemo } from 'react'
import { Direction, OrderBy, partitionOrderBy, toggleColumn } from '../../helpers/sort'
import ColumnHeader from '../ColumnHeader/ColumnHeader'

interface TableHeaderProps {
  header: string[]
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  dataReady: boolean
  ariaRowIndex: number // aria row index for the header
  sortable?: boolean
  columnClassNames?: (string | undefined)[] // array of class names for each column
  onHideColumn?: (columnIndex: number) => void
  onShowAllColumns?: () => void
  hiddenColumns?: number[]
}

/**
 * Render a header for a table.
 */
export default function TableHeader({
  header,
  orderBy,
  onOrderByChange,
  dataReady,
  ariaRowIndex,
  sortable = true,
  columnClassNames = [],
  onHideColumn,
  onShowAllColumns,
  hiddenColumns,
}: TableHeaderProps) {
  // Map of column names to their sort direction and index in the orderBy array
  const orderByColumn = useMemo(
    () =>
      new Map(
        (orderBy ?? []).map(({ column, direction }, index) => [
          column,
          { direction, index },
        ])
      ),
    [orderBy]
  )

  // Memoize the mapping from visible indices to original indices
  const visibleToOriginalMap = useMemo(() => {
    const mapping = new Map<number, number>()

    // Check if there are no hidden columns - this is an optimization path
    // When no columns are hidden, visible indices exactly match original indices
    // (i.e., visibleIndex 0 → originalIndex 0, visibleIndex 1 → originalIndex 1, etc.)
    if (!hiddenColumns || hiddenColumns.length === 0) {
      header.forEach((_, idx) => mapping.set(idx, idx))
      return mapping
    }

    // Create a list of all original column indices
    const allOriginalColumns = new Set(
      Array.from({ length: header.length + hiddenColumns.length }, (_, i) => i)
    )

    // Remove hidden columns
    hiddenColumns.forEach(index => allOriginalColumns.delete(index))

    // Map visible indices to original indices
    Array.from(allOriginalColumns)
      .sort((a, b) => a - b)
      .forEach((originalIndex, visibleIndex) => {
        mapping.set(visibleIndex, originalIndex)
      })

    return mapping
  }, [hiddenColumns, header])

  // Create changeSort callbacks for each column
  const getChangeSort = useCallback(
    (columnName: string) => {
      if (!orderBy || !onOrderByChange) return undefined

      return (options?: { direction: Direction | null }) => {
        if (!options) {
          // Toggle sort when called without options (header click)
          onOrderByChange(toggleColumn(columnName, orderBy))
          return
        }

        const { direction } = options
        const { prefix, suffix } = partitionOrderBy(orderBy, columnName)

        if (direction === null) {
          // Remove column from sort criteria
          onOrderByChange([...prefix, ...suffix])
        } else {
          // Set explicit direction as primary sort
          onOrderByChange([{ column: columnName, direction }, ...prefix, ...suffix])
        }
      }
    },
    [orderBy, onOrderByChange]
  )

  // Create hide column callbacks for each column
  const getHideColumnCallback = useCallback(
    (originalIndex: number) => {
      if (!onHideColumn) return undefined

      return () => {
        onHideColumn(originalIndex)
      }
    },
    [onHideColumn]
  )

  const isHideDisabled = header.length <= 1

  return header.map((name, visibleIndex) => {
    // Get the original index from our memoized mapping
    const originalIndex = visibleToOriginalMap.get(visibleIndex) ?? visibleIndex
    const ariaColIndex = originalIndex + 2 // 1-based, include the row header

    return (
      <ColumnHeader
        key={originalIndex}
        dataReady={dataReady}
        direction={orderByColumn.get(name)?.direction}
        orderByIndex={orderByColumn.get(name)?.index}
        orderBySize={orderBy?.length}
        onClick={getChangeSort(name)}
        onHideColumn={getHideColumnCallback(originalIndex)}
        isHideDisabled={isHideDisabled}
        onShowAllColumns={onShowAllColumns}
        sortable={sortable && orderBy !== undefined}
        columnName={name}
        columnIndex={originalIndex}
        className={columnClassNames[visibleIndex]}
        ariaColIndex={ariaColIndex}
        ariaRowIndex={ariaRowIndex}
      >
        {name}
      </ColumnHeader>
    )
  })
}
