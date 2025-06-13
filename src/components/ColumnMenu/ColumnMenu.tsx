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
}

function MenuItem({ onClick, label }: MenuItemProps) {
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
  onToggle: () => void
  id?: string
}

export default function ColumnMenu({
  columnName,
  isOpen,
  position,
  direction,
  sortable,
  onClick,
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
      e.preventDefault()
      e.stopPropagation()
      switch (e.key) {
      case 'Escape':
        onToggle()
        break
      case 'Enter':
      case ' ':
        if (sortable) {
          onClick?.()
        }
        break
      case 'ArrowUp':
      case 'ArrowLeft':
        navigateFocus('previous')
        break
      case 'ArrowDown':
      case 'ArrowRight':
        navigateFocus('next')
        break
      case 'Home':
        navigateFocus('first')
        break
      case 'End':
        navigateFocus('last')
        break
      case 'Tab':
        navigateFocus(e.shiftKey ? 'previous' : 'next')
        break
      }
    },
    [navigateFocus, onToggle, onClick, sortable]
  )

  const handleOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      onToggle()
    },
    [onToggle]
  )

  const onWrapperClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    // Prevent click on the presentation div from propagating
    // Note that the div will receive focus anyway
    e.preventDefault()
    e.stopPropagation()
  }, [])

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
        onClick={onWrapperClick}
      >
        <div role='presentation' id={labelId} aria-hidden="true">{columnName}</div>
        <hr role='separator' aria-hidden="true" />
        {sortable && sortDirection &&
          <MenuItem
            onClick={onClick}
            label={sortDirection}
          />
        }
      </div>
    </>,
    containerRef.current ?? document.body
  )
}
