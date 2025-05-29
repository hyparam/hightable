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
  useState,
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

interface MenuItemProps {
  onClick?: () => void
  label: string
  columnName: string
}

function MenuItem({ onClick, label, columnName }: MenuItemProps) {
  return (
    <button
      role='menuitem'
      onClick={onClick}
      tabIndex={0}
      aria-label={`${label} ${columnName}`}
      aria-haspopup='false'
    >
      {label}
    </button>
  )
}

interface OverlayProps {
  onClick: (e: MouseEvent<HTMLDivElement>) => void
}

function Overlay({ onClick }: OverlayProps) {
  return <div role='presentation' onClick={onClick} />
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
  const [isScrollLocked, setIsScrollLocked] = useState(false)

  // Handle scroll lock using React state
  useEffect(() => {
    if (isOpen && !isScrollLocked) {
      document.body.style.overflow = 'hidden'
      setIsScrollLocked(true)
    } else if (!isOpen && isScrollLocked) {
      document.body.style.overflow = ''
      setIsScrollLocked(false)
    }
    return () => {
      if (isScrollLocked) {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, isScrollLocked])

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        onToggle(columnIndex)
        buttonRef?.current?.focus()
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        onClick?.()
        break
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
      <Overlay onClick={handleOverlayClick} />
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
        {sortable && sortDirection && (
          <MenuItem
            onClick={onClick}
            label={sortDirection}
            columnName={columnName}
          />
        )}
      </div>
    </>,
    containerRef.current ?? document.body
  )
}
