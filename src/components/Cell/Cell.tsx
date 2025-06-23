import { KeyboardEvent, MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DataFrame, DataFrameEvents, ResolvedValue } from '../../helpers/dataframe/index.js'
import { OrderBy, areEqualOrderBy } from '../../helpers/sort.js'
import { useCellNavigation } from '../../hooks/useCellsNavigation.js'
import { useColumnStates } from '../../hooks/useColumnStates.js'

interface Props {
  ariaColIndex: number
  ariaRowIndex: number
  column: string
  columnIndex: number
  data: DataFrame
  rowIndex: number
  stringify: (value: unknown) => string | undefined
  className?: string
  dataRowIndex?: number
  onDoubleClick?: (event: MouseEvent) => void
  onMouseDown?: (event: MouseEvent) => void
  onKeyDown?: (event: KeyboardEvent) => void
  orderBy?: OrderBy
}

/**
 * Render a table cell <td> with title and optional custom rendering
 *
 * @param {Object} props
 * @param {number} props.ariaColIndex aria col index
 * @param {number} props.ariaRowIndex aria row index
 * @param {string} props.column column name in the dataframe
 * @param {number} props.columnIndex column index in the table (0-based)
 * @param {DataFrame} props.data the dataframe to get the cell from
 * @param {number} props.rowIndex row index in the table (0-based)
 * @param {function} props.stringify function to stringify the value
 * @param {string} [props.className] class name
 * @param {number} [props.dataRowIndex] index of the row in the dataframe (0-based)
 * @param {function} [props.onDoubleClick] double click callback
 * @param {function} [props.onMouseDown] mouse down callback
 * @param {function} [props.onKeyDown] key down callback
 * @param {OrderBy} [props.orderBy] order by to sort the dataframe
 */
export default function Cell({ data, rowIndex, column, orderBy, onDoubleClick, onMouseDown, onKeyDown, stringify, columnIndex, className, ariaColIndex, ariaRowIndex, dataRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const [cell, setCell] = useState<ResolvedValue | undefined>(data.getCell({ row: rowIndex, column, orderBy }))
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleMouseDown = useCallback((event: MouseEvent) => {
    navigateToCell()
    onMouseDown?.(event)
  }, [onMouseDown, navigateToCell])
  const handleDoubleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onDoubleClick?.(event)
  }, [onDoubleClick, navigateToCell])
  useEffect(() => {
    function onFetchEvent(event: CustomEvent<DataFrameEvents['dataframe:update']>) {
      const { rowStart, rowEnd, columns, orderBy: eventOrderBy } = event.detail
      if (rowStart <= rowIndex && rowIndex < rowEnd && columns.includes(column) && areEqualOrderBy(orderBy, eventOrderBy)) {
        // the cell data has been fetched (or cleaned)
        setCell(data.getCell({ row: rowIndex, column, orderBy }))
      }
    }
    data.eventTarget.addEventListener('dataframe:update', onFetchEvent)
    return () => {
      data.eventTarget.removeEventListener('dataframe:update', onFetchEvent)
    }
  }, [data, rowIndex, column, orderBy])

  // Get the column width from the context
  const { getColumnStyle } = useColumnStates()
  const columnStyle = getColumnStyle?.(columnIndex)

  // render as truncated text
  const str = useMemo(() => {
    return stringify(cell?.value)
  }, [stringify, cell])
  const title = useMemo(() => {
    if (str === undefined ) {
      return undefined
    }
    if (str.length > 400) {
      return `${str.slice(0, 397)}\u2026` // ...
    }
    if (str.length > 100) {
      return str
    }
  }, [str])
  return (
    <td
      ref={ref}
      role="cell"
      aria-busy={cell === undefined}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      data-rowindex={dataRowIndex}
      tabIndex={tabIndex}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleMouseDown}
      onKeyDown={onKeyDown}
      style={columnStyle}
      className={className}
      title={title}>
      {str}
    </td>
  )
}
