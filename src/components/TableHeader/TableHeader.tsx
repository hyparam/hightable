import type { ColumnParameters } from '../../contexts/ColumnParametersContext.js'
import { ariaOffset } from '../../helpers/constants.js'
import ColumnHeader from '../ColumnHeader/ColumnHeader.js'

interface TableHeaderProps {
  columnsParameters: ColumnParameters[]
  ariaRowIndex: number // aria row index for the header
  canMeasureColumn?: Record<string, boolean> // indicates if the width of a column can be measured.
}

/**
 * Render a header for a table.
 */
export default function TableHeader({
  columnsParameters, canMeasureColumn, ariaRowIndex,
}: TableHeaderProps) {
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
