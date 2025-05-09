import { MouseEvent, useCallback, useMemo } from 'react'
import { Direction, OrderBy, partitionOrderBy } from '../../helpers/sort.js'
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
  hasHiddenColumns?: boolean
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
  hasHiddenColumns,
  hiddenColumns,
}: TableProps) {
  // Function to handle click for changing orderBy
  const getOnOrderByClick = useCallback(
    (columnHeader: string) => {
      if (!onOrderByChange || !orderBy) return undefined

      return (e: MouseEvent & { sortDirection?: Direction } ) => {
        // Check if we have an explicit sort direction from the menu
        const { sortDirection } = e

        // If the sort direction is undefined, it means the header was clicked
        if (sortDirection !== undefined) {
          // This branch handles sort actions coming from the column menu
          // The menu explicitly passes 'ascending', 'descending', or null
          // as opposed to header clicks which don't specify a direction (undefined)
          const { prefix, suffix } = partitionOrderBy(orderBy, columnHeader)

          if (sortDirection === null) {
            // User selected "Clear sort" from the column menu
            // This removes the column from the sort criteria entirely
            onOrderByChange([...prefix, ...suffix])
          } else {
            // User selected either "Sort ascending" or "Sort descending" from the menu
            // Apply the exact sort direction that was requested
            onOrderByChange([{ column: columnHeader, direction: sortDirection }, ...prefix, ...suffix])
          }
        } else {
          // This branch handles direct column header clicks (not from menu)
          // Implements the cycling behavior: none → ascending → descending → none
          const { prefix, item, suffix } = partitionOrderBy(orderBy, columnHeader)

          if (item) {
            // Column is already in the sort - cycle through directions
            if (item.direction === 'ascending') {
              // ascending -> descending
              onOrderByChange([{ column: columnHeader, direction: 'descending' }, ...suffix])
            } else {
              // descending -> none
              onOrderByChange([...suffix])
            }
          } else {
            // Column is not in sort - make it primary with ascending direction
            onOrderByChange([{ column: columnHeader, direction: 'ascending' }, ...prefix, ...suffix])
          }
        }
      }
    },
    [orderBy, onOrderByChange]
  )

  const orderByColumn = useMemo(() => {
    return new Map(
      (orderBy ?? []).map(({ column, direction }, index) => [column, { direction, index }])
    )
  }, [orderBy])

  const handleHideColumn = useCallback(
    (columnIndex: number) => {
      if (onHideColumn) {
        onHideColumn(columnIndex)
      }
    },
    [onHideColumn]
  )

  return header.map((name, columnIndex) => {
    // Note: columnIndex is the index of the column in the dataframe header
    // and not the index of the column in the table (which can be different if
    // some columns are hidden, or if the order is changed)
    return (
      // The ColumnHeader component width is controlled by the parent
      <ColumnHeader
        key={columnIndex}
        dataReady={dataReady}
        direction={orderByColumn.get(name)?.direction}
        orderByIndex={orderByColumn.get(name)?.index}
        orderBySize={orderBy?.length}
        onClick={getOnOrderByClick(name)}
        onHideColumn={handleHideColumn}
        onShowAllColumns={onShowAllColumns}
        hasHiddenColumns={hasHiddenColumns}
        sortable={sortable}
        columnName={name}
        columnIndex={columnIndex}
        className={columnClassNames[columnIndex]}
        visibleHeader={header}
      >
        {name}
      </ColumnHeader>
    )
  })
}
