import { CSSProperties, ChangeEvent, KeyboardEvent, MouseEvent, useCallback, useMemo, useRef } from 'react'
import { useCellFocus } from '../../hooks/useCellFocus'
import { useOnCopy } from '../../hooks/useOnCopyToClipboard.js'

interface Props {
  selected?: boolean
  rowNumber?: number
  onCheckboxPress?: ({ shiftKey }: { shiftKey: boolean }) => void
  pendingSelectionGesture?: boolean
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

export default function RowHeader({ onCheckboxPress, pendingSelectionGesture, style, ariaColIndex, ariaRowIndex, selected, rowNumber }: Props) {
  const ref = useRef<HTMLTableCellElement | null>(null)
  const { tabIndex, navigateToCell } = useCellFocus({ ref, ariaColIndex, ariaRowIndex })
  const handleClick = useCallback((event: MouseEvent) => {
    navigateToCell()
    onCheckboxPress?.({ shiftKey: event.shiftKey })
  }, [onCheckboxPress, navigateToCell])
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      // TODO: let the event propagate?
      event.stopPropagation()
      onCheckboxPress?.({ shiftKey: event.shiftKey })
    }
  }, [onCheckboxPress])
  const disabledCheckbox = onCheckboxPress === undefined
  const onChange = useCallback((e: ChangeEvent) => { e.preventDefault() }, [])
  const str = useMemo(() => {
    return formatRowNumber(rowNumber)
  }, [rowNumber])
  const handleCopy = useOnCopy(str)

  return (
    <th
      ref={ref}
      scope="row"
      role="rowheader"
      style={style}
      onClick={handleClick}
      onCopy={handleCopy}
      onKeyDown={handleKeyDown}
      aria-busy={rowNumber === undefined}
      aria-checked={selected}
      aria-rowindex={ariaRowIndex}
      aria-colindex={ariaColIndex}
      aria-disabled={disabledCheckbox}
      tabIndex={tabIndex}
      data-rownumber={rowNumber}
    >
      <span>{str}</span>
      {selected !== undefined && <input
        type='checkbox'
        onChange={onChange}
        readOnly={disabledCheckbox}
        disabled={disabledCheckbox}
        aria-busy={pendingSelectionGesture}
        checked={selected}
        role="presentation"
        tabIndex={-1}
      />}
    </th>
  )
}
