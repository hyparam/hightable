import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { usePortalContainer } from '../../hooks/usePortalContainer'
import { KeyboardEvent, useCallback, useEffect, useRef } from 'react'

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
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Focus the menu when it becomes visible
  useEffect(() => {
    if (isVisible && menuRef.current) {
      menuRef.current.focus()
    }
  }, [isVisible])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        const columnButton =
          document.activeElement?.parentElement?.querySelector(
            'div[role="button"]'
          )
        if (columnButton instanceof HTMLElement) {
          columnButton.focus()
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onClick?.()
      }
    },
    [onClick]
  )

  if (!isVisible) {
    return null
  }

  return createPortal(
    <div
      role='menu'
      style={{ top, left }}
      ref={menuRef}
      tabIndex={-1}
      aria-label={`${columnName} column menu`}
      onKeyDown={handleKeyDown}
    >
      <div role='presentation'>{columnName}</div>
      <hr role='separator' />
      {sortable &&
        <>
          <button
            role='menuitem'
            onClick={onClick}
            tabIndex={0}
            aria-label={`${getSortDirection()} ${columnName}`}
          >
            {getSortDirection()}
          </button>
        </>
      }
    </div>,
    containerRef.current ?? document.body
  )
}
