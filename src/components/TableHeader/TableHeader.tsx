import { useCallback, useMemo } from 'react'
import { Direction, OrderBy, partitionOrderBy, toggleColumn } from '../../helpers/sort.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableProps {
  header: string[]
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  dataReady: boolean
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
  sortable = true,
  columnClassNames = [],
  onHideColumn,
  onShowAllColumns,
  hiddenColumns,
}: TableProps) {
  // Derive hasHiddenColumns from hiddenColumns prop
  const hasHiddenColumns = Boolean(hiddenColumns && hiddenColumns.length > 0)

  const orderByColumn = useMemo(() => {
    return new Map(
      (orderBy ?? []).map(({ column, direction }, index) => [column, { direction, index }])
    )
  }, [orderBy])

  // Memoize the mapping from visible indices to original indices
  const visibleToOriginalMap = useMemo(() => {
    // Create a mapping function that converts visible indices to original indices
    const mapping = new Map<number, number>()

    // Check if there are no hidden columns - this is an optimization path
    // When no columns are hidden, visible indices exactly match original indices
    // (i.e., visibleIndex 0 → originalIndex 0, visibleIndex 1 → originalIndex 1, etc.)
    if (!hiddenColumns || hiddenColumns.length === 0) {
      header.forEach((_, idx) => mapping.set(idx, idx))
      return mapping
    }

    // Sort hidden columns for consistent processing
    const sortedHiddenColumns = [...hiddenColumns].sort((a, b) => a - b)

    // For each visible index, calculate the corresponding original index
    header.forEach((_, visibleIndex) => {
      let hiddenBefore = 0
      for (const hiddenIdx of sortedHiddenColumns) {
        if (hiddenIdx <= visibleIndex + hiddenBefore) {
          hiddenBefore++
        }
      }
      mapping.set(visibleIndex, visibleIndex + hiddenBefore)
    })

    return mapping
  }, [header, hiddenColumns])

  // Create changeSort callbacks for each column
  const getChangeSort = useCallback(
    (columnName: string) => {
      // If sorting is disabled or orderBy/onOrderByChange are not provided, return undefined
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

  return header.map((name, visibleIndex) => {
    // Get the original index from our memoized mapping
    const originalIndex = visibleToOriginalMap.get(visibleIndex) ?? visibleIndex

    return (
      // The ColumnHeader component width is controlled by the parent
      <ColumnHeader
        key={originalIndex}
        dataReady={dataReady}
        direction={orderByColumn.get(name)?.direction}
        orderByIndex={orderByColumn.get(name)?.index}
        orderBySize={orderBy?.length}
        changeSort={getChangeSort(name)}
        onHideColumn={getHideColumnCallback(originalIndex)}
        onShowAllColumns={hasHiddenColumns ? onShowAllColumns : undefined}
        sortable={sortable && orderBy !== undefined}
        columnName={name}
        columnIndex={originalIndex}
        className={columnClassNames[originalIndex]}
        visibleHeader={header}
      >
        {name}
      </ColumnHeader>
    )
  })
}
