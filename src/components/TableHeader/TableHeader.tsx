import { useCallback, useMemo, useState } from 'react'
import { OrderBy, toggleColumn } from '../../helpers/sort.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableProps {
  header: string[]
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  dataReady: boolean
  sortable?: boolean
  columnClassNames?: (string | undefined)[] // array of class names for each column
  onHideColumn?: (columnIndex: number) => void
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
}: TableProps) {
  // Function to handle click for changing orderBy
  const getOnOrderByClick = useCallback(
    (columnHeader: string) => {
      if (!onOrderByChange || !orderBy) return undefined
      return () => {
        onOrderByChange(toggleColumn(columnHeader, orderBy))
      }
    },
    [orderBy, onOrderByChange]
  )

  const orderByColumn = useMemo(() => {
    return new Map(
      (orderBy ?? []).map(({ column, direction }, index) => [column, { direction, index }])
    )
  }, [orderBy])

  // Track visible columns
  const [visibleColumns, setVisibleColumns] = useState<number[]>(header.map((_, index) => index))

  const handleHideColumn = useCallback(
    (columnIndex: number) => {
      if (onHideColumn) {
        onHideColumn(columnIndex)
      } else {
        // Default implementation if no handler provided
        setVisibleColumns(prev => prev.filter(idx => idx !== columnIndex))
      }
    },
    [onHideColumn]
  )

  return visibleColumns.map(columnIndex => {
    const name = header[columnIndex] as string
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
