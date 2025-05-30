import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort'
import { usePortalContainer } from '../../hooks/usePortalContainer'
import {
  KeyboardEvent,
  MouseEvent,
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
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const { top, left } = position
  const menuRef = useRef<HTMLDivElement>(null)
  const labelId = useRef(`column-menu-label-${columnIndex}`).current
  const [isScrollLocked, setIsScrollLocked] = useState(false)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  // Handle scroll lock
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
    if (isOpen) {
      // Store the previously focused element
      previousFocusRef.current = document.activeElement as HTMLElement
      // Focus the first focusable element in the menu
      const focusableElements = menuRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusableElements?.length) {
        const firstElement = focusableElements[0] as HTMLElement
        // Use requestAnimationFrame to ensure the menu is rendered before focusing
        requestAnimationFrame(() => {
          firstElement.focus()
        })
      }
    } else if (previousFocusRef.current) {
      // Restore focus when closing
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen])

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
        onClick?.()
        break
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Tab': {
        e.preventDefault()
        e.stopPropagation()
        const focusableElements = menuRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements?.length) return

        const { activeElement } = document
        if (!activeElement) return
        const currentIndex = Array.from(focusableElements).indexOf(activeElement)

        let nextIndex = currentIndex
        switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
        case 'Tab':
          if (e.shiftKey || e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
            nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
          } else {
            nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
          }
          break
        case 'ArrowDown':
        case 'ArrowRight':
          nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
          break
        }

        const nextElement = focusableElements[nextIndex]
        if (nextElement instanceof HTMLElement) {
          nextElement.focus()
        }
        break
      }
      default:
        // Prevent any other key from propagating to the table
        e.preventDefault()
        e.stopPropagation()
        break
      }
    },
    [columnIndex, onToggle, onClick]
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
