import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { usePortalContainer } from '../../hooks/usePortalContainer'
import {
  KeyboardEvent,
  MouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useRef,
} from 'react'

function getSortDirection(direction?: Direction, sortable?: boolean) {
  if (!sortable) return null

  switch (direction) {
  case 'ascending':
    return 'Ascending'
  case 'descending':
    return 'Descending'
  default:
    return 'Sort'
  }
}

interface ColumnMenuProps {
  columnName: string
  isOpen: boolean
  position: {
    left: number
    top: number
  }
  direction?: Direction
  sortable?: boolean
  onClick?: () => void
  columnIndex: number
  onToggle: (columnIndex: number) => void
  buttonRef?: RefObject<HTMLDivElement | null>
}

export default function ColumnMenu({
  columnName,
  isOpen,
  position,
  direction,
  sortable,
  onClick,
  columnIndex,
  onToggle,
  buttonRef,
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const { top, left } = position
  const menuRef = useRef<HTMLDivElement>(null)
  const labelId = useRef(`column-menu-label-${columnIndex}`).current

  // Prevent scrolling when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Focus the menu when it becomes visible
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onToggle(columnIndex)

        if (buttonRef?.current) {
          buttonRef.current.focus()
        }
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()
        onClick?.()
      }
    },
    [columnIndex, onToggle, buttonRef, onClick]
  )

  const handleOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onToggle(columnIndex)
    },
    [columnIndex, onToggle]
  )

  if (!isOpen) {
    return null
  }

  const sortDirection = getSortDirection(direction, sortable)

  return createPortal(
    <>
      <div role='presentation' onClick={handleOverlayClick} />
      <div
        role='menu'
        style={{ top, left }}
        ref={menuRef}
        tabIndex={-1}
        aria-labelledby={labelId}
        aria-orientation='vertical'
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
      >
        <div role='presentation' id={labelId}>{columnName}</div>
        <hr role='separator' />
        {sortable &&
          <button
            role='menuitem'
            onClick={onClick}
            tabIndex={0}
            aria-label={`${sortDirection} ${columnName}`}
            aria-haspopup='false'
          >
            {sortDirection}
          </button>
        }
      </div>
    </>,
    containerRef.current ?? document.body
  )
}
