import { useCallback, useMemo } from 'react'
import { OrderBy, toggleColumn, toggleColumnExclusive } from '../../helpers/sort.js'
import { useData } from '../../hooks/useData.js'
import { ColumnParameters } from '../../hooks/useTableConfig.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableHeaderProps {
  columnsParameters: ColumnParameters[]
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  onOrderByChange?: (orderBy: OrderBy) => void // callback to call when a user interaction changes the order. The interactions are disabled if undefined.
  canMeasureWidth: boolean // indicates if the width of the columns can be measured.
  ariaRowIndex: number // aria row index for the header
  columnClassNames?: (string | undefined)[] // array of class names for each column
}

/**
 * Render a header for a table.
 */
export default function TableHeader({
  columnsParameters, orderBy, onOrderByChange, canMeasureWidth, ariaRowIndex, columnClassNames = [],
}: TableHeaderProps) {
  const { data } = useData()
  const exclusiveSort = data.exclusiveSort === true
  // Function to handle click for changing orderBy
  const getToggleOrderBy = useCallback((columnHeader: string) => {
    if (!onOrderByChange || !orderBy) return undefined
    return () => {
      const next = exclusiveSort ? toggleColumnExclusive(columnHeader, orderBy) : toggleColumn(columnHeader, orderBy)
      onOrderByChange(next)
    }}, [orderBy, onOrderByChange, exclusiveSort]
  )

  const orderByColumn = useMemo(() => {
    return new Map((orderBy ?? []).map(({ column, direction }, index) => [column, { direction, index }]))
  }, [orderBy])

  return columnsParameters.map((columnParameters) => {
    const { name, index: columnIndex, ...columnConfig } = columnParameters
    // Note: columnIndex is the index of the column in the dataframe header
    // and not the index of the column in the table (which can be different if
    // some columns are hidden, or if the order is changed)
    const ariaColIndex = columnIndex + 2 // 1-based, include the row header
    return (
      // The ColumnHeader component width is controlled by the parent
      <ColumnHeader
        key={columnIndex}
        canMeasureWidth={canMeasureWidth}
        direction={orderByColumn.get(name)?.direction}
        orderByIndex={orderByColumn.get(name)?.index}
        orderBySize={orderBy?.length}
        toggleOrderBy={getToggleOrderBy(name)}
        columnName={name}
        columnIndex={columnIndex}
        className={columnClassNames[columnIndex]}
        ariaColIndex={ariaColIndex}
        ariaRowIndex={ariaRowIndex}
        columnConfig={columnConfig}
      >
        {name}
      </ColumnHeader>
    )
  })
}
