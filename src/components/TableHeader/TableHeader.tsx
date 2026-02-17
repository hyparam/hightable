import { useMemo } from 'react'

import type { ColumnParameters } from '../../contexts/ColumnParametersContext.js'
import { ariaOffset } from '../../helpers/constants.js'
import type { OrderBy } from '../../helpers/sort.js'
import { toggleColumn, toggleColumnExclusive } from '../../helpers/sort.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableHeaderProps {
  columnsParameters: ColumnParameters[]
  ariaRowIndex: number // aria row index for the header
  orderBy?: OrderBy // array of column order by clauses. If undefined, the table is unordered, the sort elements are hidden and the interactions are disabled.
  setOrderBy?: (orderBy: OrderBy) => void // function to set the order. The interactions are disabled if undefined.
  canMeasureColumn?: Record<string, boolean> // indicates if the width of a column can be measured.
  exclusiveSort?: boolean // whether to use exclusive sort mode
}

/**
 * Render a header for a table.
 */
export default function TableHeader({
  columnsParameters, orderBy, setOrderBy, canMeasureColumn, ariaRowIndex, exclusiveSort,
}: TableHeaderProps) {
  const toggleOrderBys = useMemo(() => {
    return Object.fromEntries(columnsParameters.map(({ name }) => {
      const toggleOrderBy = (!setOrderBy || !orderBy)
        ? undefined
        : () => {
            const next = exclusiveSort ? toggleColumnExclusive(name, orderBy) : toggleColumn(name, orderBy)
            setOrderBy(next)
          }
      return [name, toggleOrderBy]
    }))
  }, [columnsParameters, orderBy, setOrderBy, exclusiveSort])

  const orderByColumn = useMemo(() => {
    return new Map((orderBy ?? []).map(({ column, direction }, index) => [column, { direction, index }]))
  }, [orderBy])

  return columnsParameters.map((columnParameters, visibleColumnIndex) => {
    const { name, index: columnIndex, className } = columnParameters
    // Note: columnIndex is the index of the column in the dataframe header
    // and not the index of the column in the table (which can be different if
    // some columns are hidden, or if the order is changed)
    return (
      // The ColumnHeader component width is controlled by the parent
      <ColumnHeader
        key={columnIndex}
        canMeasureWidth={canMeasureColumn?.[name] === true}
        direction={orderByColumn.get(name)?.direction}
        orderByIndex={orderByColumn.get(name)?.index}
        orderBySize={orderBy?.length}
        toggleOrderBy={toggleOrderBys[name]}
        columnName={name}
        columnIndex={columnIndex}
        className={className}
        ariaColIndex={visibleColumnIndex + ariaOffset}
        ariaRowIndex={ariaRowIndex}
        columnConfig={columnParameters}
      >
        {name}
      </ColumnHeader>
    )
  })
}
