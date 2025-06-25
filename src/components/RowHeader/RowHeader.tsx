import { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, useCallback, useRef } from 'react'
import { useCellNavigation } from '../../hooks/useCellsNavigation'
import { useRow } from '../../hooks/useUnsortedRow'

interface Props {
  onCheckboxPress?: ({ row, shiftKey }: {row: number, shiftKey: boolean}) => void
  showCheckBox?: boolean
  style?: CSSProperties
  ariaColIndex: number
  ariaRowIndex: number
}

function formatRowNumber(rowIndex?: number): string {
  if (rowIndex === undefined) return ''
  // rowIndex + 1 to display 1-based row numbers
  return (rowIndex + 1).toLocaleString('en-US')
}

export default function RowHeader({ onCheckboxPress, style, ariaColIndex, ariaRowIndex }: Props) {
  const ref = useRef<HTMLTableCellElement>(null)
  const { unsortedRow, selected } = useRow()
  const { tabIndex, navigateToCell } = useCellNavigation({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    if (unsortedRow !== undefined && onCheckboxPress) {
      onCheckboxPress({ row: unsortedRow, shiftKey: event.shiftKey })
    }
  }, [onCheckboxPress, navigateToCell, unsortedRow])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // TODO: let the event propagate?
      event.stopPropagation()
      if (unsortedRow !== undefined && onCheckboxPress) {
        onCheckboxPress({ row: unsortedRow, shiftKey: event.shiftKey })
      }
    }
  }, [onCheckboxPress, unsortedRow])
  const disabledCheckbox = onCheckboxPress === undefined
  const onChange = useCallback((e: ChangeEvent) => {e.preventDefault()}, [])

  return (
    <th
      ref={ref}
      scope="row"
      role="rowheader"
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-busy={unsortedRow === undefined}
      aria-checked={selected}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      aria-disabled={disabledCheckbox}
      tabIndex={tabIndex}
      data-rowindex={unsortedRow}
    >
      <span>{formatRowNumber(unsortedRow)}</span>
      {selected !== undefined && <input
        type='checkbox'
        onChange={onChange}
        readOnly={disabledCheckbox}
        disabled={disabledCheckbox}
        checked={selected}
        role="presentation"
        tabIndex={-1}
      />}
    </th>
  )
}
