import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { usePortalContainer } from '../../hooks/usePortalContainer'
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
}

export default function ColumnMenu({
  columnName,
  isVisible,
  position,
  direction,
  sortable,
  onClick,
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const { top, left } = position

  const getSortDirection = useCallback(() => {
    if (!sortable) return null

    switch (direction) {
    case 'ascending':
      return 'Ascending'
    case 'descending':
      return 'Descending'
    default:
      return 'Sort'
    }
  }, [direction, sortable])

  if (!isVisible) {
    return null
  }

  return createPortal(
    <div role='menu' style={{ top, left }}>
      <div role='presentation'>{columnName}</div>
      <hr role='separator' />
      {sortable &&
        <>
          <button role='menuitem' onClick={onClick}>
            {getSortDirection()}
          </button>
        </>
      }
    </div>,
    containerRef.current ?? document.body
  )
}
