import { MouseEvent, useCallback, useMemo } from 'react'
import { OrderBy, partitionOrderBy, Direction } from '../../helpers/sort.js'
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
}: TableProps) {
  // Function to handle click for changing orderBy
  const getOnOrderByClick = useCallback(
    (columnHeader: string) => {
      if (!onOrderByChange || !orderBy) return undefined
      
      return (e: MouseEvent & { sortDirection: Direction } ) => {
        // Check if we have an explicit sort direction from the menu
        const sortDirection = e.sortDirection;
        
        if (sortDirection !== undefined) {
          // Handle explicit sort directions from the menu
          const { prefix, suffix } = partitionOrderBy(orderBy, columnHeader);
          
          if (sortDirection === null) {
            // Clear sort
            onOrderByChange([...prefix, ...suffix]);
          } else {
            // Apply specific sort direction
            onOrderByChange([{ column: columnHeader, direction: sortDirection }, ...prefix, ...suffix]);
          }
        } else {
          // Regular click toggles through the sort states (legacy behavior)
          const { prefix, item, suffix } = partitionOrderBy(orderBy, columnHeader);
          
          if (item && prefix.length === 0) {
            // Column is already the primary sort - cycle through directions
            if (item.direction === 'ascending') {
              // ascending -> descending
              onOrderByChange([{ column: columnHeader, direction: 'descending' }, ...suffix]);
            } else {
              // descending -> none
              onOrderByChange([...suffix]);
            }
          } else {
            // Column is not primary sort - make it primary with ascending direction
            onOrderByChange([{ column: columnHeader, direction: 'ascending' }, ...prefix, ...suffix]);
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
      >
        {name}
      </ColumnHeader>
    )
  })
}
