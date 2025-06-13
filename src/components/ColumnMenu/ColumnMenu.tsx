import { KeyboardEvent, MouseEvent, useCallback, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { useFocusManagement } from '../../hooks/useFocusManagement'
import { usePortalContainer } from '../../hooks/usePortalContainer'
import { useScrollLock } from '../../hooks/useScrollLock'

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
  const handleClick = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    e.stopPropagation()
    // Focus the button when clicked
    e.currentTarget.focus()
    onClick?.()
  }, [onClick])

  return (
    <button
      role='menuitem'
      onClick={handleClick}
      tabIndex={0}
      aria-label={`${label} ${columnName}`}
      aria-haspopup='false'
      type='button'
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
  id?: string
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
  id,
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const { top, left } = position
  const menuRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  useScrollLock(isOpen)
  const { navigateFocus } = useFocusManagement(isOpen, menuRef)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      switch (e.key) {
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        onToggle(columnIndex)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        e.stopPropagation()
        if (sortable) {
          onClick?.()
        }
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        e.preventDefault()
        e.stopPropagation()
        navigateFocus('previous')
        break
      case 'ArrowDown':
      case 'ArrowRight':
        e.preventDefault()
        e.stopPropagation()
        navigateFocus('next')
        break
      case 'Tab':
        e.preventDefault()
        e.stopPropagation()
        navigateFocus(e.shiftKey ? 'previous' : 'next')
        break
      default:
        e.preventDefault()
        e.stopPropagation()
        break
      }
    },
    [navigateFocus, onToggle, columnIndex, onClick, sortable]
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
        id={id}
        role='menu'
        style={{ top, left }}
        ref={menuRef}
        tabIndex={-1}
        aria-labelledby={labelId}
        aria-orientation='vertical'
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-label={`Column menu for ${columnName}`}
      >
        <div role='presentation' id={labelId} aria-hidden="true">{columnName}</div>
        <hr role='separator' aria-hidden="true" />
        {sortable && sortDirection &&
          <MenuItem
            onClick={onClick}
            label={sortDirection}
            columnName={columnName}
          />
        }
      </div>
    </>,
    containerRef.current ?? document.body
  )
}
