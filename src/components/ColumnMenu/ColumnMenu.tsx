import { KeyboardEvent, MouseEvent, ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Direction } from '../../helpers/sort'
import { useCellsNavigation } from '../../hooks/useCellsNavigation'
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

interface MenuGroupProps {
  title: string
  children: ReactNode
}

function MenuGroup({ title, children }: MenuGroupProps) {
  return (
    <>
      <div role='separator'>{title}</div>
      {children}
    </>
  )
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
  hideColumn?: () => void // returns a function to hide the column, or undefined if the column cannot be hidden
  showAllColumns?: () => void // returns a function to show all columns, or undefined
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
  hideColumn,
  showAllColumns,
  close,
  id,
}: ColumnMenuProps) {
  const { containerRef } = usePortalContainer()
  const [container, setContainer] = useState<HTMLElement | undefined>(undefined)
  useEffect(() => {
    if (container || !containerRef.current) {
      return
    }
    setContainer(containerRef.current)
  }, [container, containerRef])

  const { top, left } = position
  const menuRef = useRef<HTMLDivElement | null>(null)
  const labelId = useId()

  const { navigateFocus } = useFocusManagement(isOpen, menuRef)
  const { focusFirstCell } = useCellsNavigation()

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

  const hideColumnAndClose = useMemo(() => {
    if (!hideColumn) {
      return undefined
    }
    return () => {
      hideColumn()
      // We focus the top left cell, which will always exist, because this column will disappear
      focusFirstCell?.()
      close()
    }
  }, [hideColumn, close, focusFirstCell])

  const showAllColumnsAndClose = useMemo(() => {
    if (!showAllColumns) {
      return undefined
    }
    return () => {
      showAllColumns()
      // no need to handle the focus here, since the column will still exist.
      close()
    }
  }, [showAllColumns, close])

  if (!isOpen) {
    return null
  }

  const sortDirection = getSortDirection(direction)

  const showVisibilityGroup = !(!hideColumnAndClose && !showAllColumnsAndClose)

  if (!container) {
    return null
  }

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
        {sortable &&
          <MenuGroup title="Sort order">
            <MenuItem
              onClick={toggleOrderBy}
              label={sortDirection}
            />
          </MenuGroup>
        }
        {showVisibilityGroup &&
          <MenuGroup title="Visibility">
            {hideColumnAndClose &&
              <MenuItem
                onClick={hideColumnAndClose}
                label={'Hide column'}
              />
            }
            {showAllColumnsAndClose &&
              <MenuItem
                onClick={showAllColumnsAndClose}
                label="Show all columns"
              />
            }
          </MenuGroup>
        }
      </div>
    </>,
    container
  )
}
