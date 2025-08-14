import { KeyboardEvent, MouseEvent, useCallback, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { useFocusManagement } from '../../hooks/useFocusManagement'
import { usePortalContainer } from '../../hooks/usePortalContainer'

function getSortDirection(direction?: Direction) {
  switch (direction) {
  case 'ascending':
    return 'Ascending'
  case 'descending':
    return 'Descending'
  default:
    return 'No sort'
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
    onClick?.()
  }, [onClick])

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation()
      e.preventDefault()
      onClick?.()
    }
  }, [onClick])

  return (
    <button
      role='menuitem'
      onClick={handleClick}
      onKeyDown={handleKeyDown}
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
  toggleOrderBy?: () => void
  close: () => void
  id?: string
}

export default function ColumnMenu({
  columnName,
  isOpen,
  position,
  direction,
  sortable,
  toggleOrderBy,
  close,
  id,
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const { top, left } = position
  const menuRef = useRef<HTMLDivElement>(null)
  const labelId = useId()

  const { navigateFocus } = useFocusManagement(isOpen, menuRef)

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    switch (e.key) {
    case 'Escape':
      close()
      break
    case 'Enter':
    case ' ':
      // Handled by the menu item
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
  }, [navigateFocus, close])

  const handleOverlayClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      close()
    },
    [close]
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

  const sortDirection = getSortDirection(direction)

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
        {sortable && <MenuItem
          onClick={toggleOrderBy}
          label={sortDirection}
        />}
      </div>
    </>,
    containerRef.current ?? document.body
  )
}
