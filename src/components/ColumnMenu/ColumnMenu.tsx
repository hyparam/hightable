import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { useCallback } from 'react'

interface ColumnMenuProps {
  columnName: string
  isVisible: boolean
  position: {
    left: number
    top: number
  }
  direction?: Direction
  sortable?: boolean
  onClick?: () => void
  refPortalContainer: HTMLElement | null
}

export default function ColumnMenu({
  columnName,
  isVisible,
  position,
  direction,
  sortable,
  onClick,
  refPortalContainer,
}: ColumnMenuProps) {
  const { top, left } = position
  const isSorted = direction === 'ascending' || direction === 'descending'

  if (!isVisible || !refPortalContainer) {
    return null
  }

  return createPortal(
    <div role='menu' style={{ top, left }}>
      <div role='presentation'>{columnName}</div>
      <hr role='separator' />
      {sortable && (
        <>
          <button role='menuitem' onClick={onClick}>
            {direction === 'ascending' ? '✓ ' : ''}Sort ascending
          </button>

          <button role='menuitem' onClick={onClick}>
            {direction === 'descending' ? '✓ ' : ''}Sort descending
          </button>

          {isSorted && (
            <button role='menuitem' onClick={onClick}>
              Clear sort
            </button>
          )}
        </>
      )}
    </div>,
    refPortalContainer
  )
}
