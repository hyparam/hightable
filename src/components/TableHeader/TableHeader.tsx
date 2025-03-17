import { useCallback, useMemo } from 'react'
import { OrderBy, toggleColumn } from '../../helpers/sort.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableProps {
  header: string[]
  cacheKey?: string // used to persist column widths
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  dataReady: boolean
}

/**
 * Render a header for a table.
 */
export default function TableHeader({
  header, cacheKey, orderBy, onOrderByChange, dataReady,
}: TableProps) {
  // Function to handle click for changing orderBy
  const getOnOrderByClick = useCallback((columnHeader: string) => {
    if (!onOrderByChange || !orderBy) return undefined
    return () => {
      onOrderByChange(toggleColumn(columnHeader, orderBy))
    }}, [orderBy, onOrderByChange]
  )

  const directionByColumn = useMemo(() => {
    return new Map((orderBy ?? []).map(({ column, direction }) => [column, direction]))
  }, [orderBy])

  return header.map((name, index) => {
    const suffix = `${index}:${name}`
    // Considerations:
    // - File contents can change, so column sizes are saved by name.
    // - There could be duplicate column names.
    const localStorageKey = cacheKey ? `${cacheKey}:${suffix}` : undefined
    // TODO(SL): if we implement changing the order of the columns, or hiding columns,
    // we might want to replace `index` with something else in the key
    // to preserve the element between refreshes
    const key = localStorageKey ?? suffix
    return (
      // The ColumnHeader component width is controlled by the parent
      <ColumnHeader
        key={key}
        localStorageKey={localStorageKey}
        dataReady={dataReady}
        direction={directionByColumn.get(name)}
        onClick={getOnOrderByClick(name)}
        title={name}
      >
        {name}
      </ColumnHeader>
    )
  })
}
