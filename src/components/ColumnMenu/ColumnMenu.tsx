import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import { useHighTable } from '../HighTable/HighTableContext.js'

interface ColumnMenuProps {
  column: string
  onHideColumn?: () => void
  isHideDisabled?: boolean
  onShowAllColumns?: () => void
  sortable?: boolean
  direction?: Direction
  onSort?: () => void
  isVisible?: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export default function ColumnMenu({
  column,
  onHideColumn,
  isHideDisabled = false,
  onShowAllColumns,
  sortable,
  direction,
  onSort,
  isVisible = false,
  position,
  onClose,
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleHideColumn = useCallback(() => {
    if (isHideDisabled) return
    onHideColumn?.()
    onClose()
  }, [onHideColumn, onClose, isHideDisabled])

  const handleShowAllColumns = useCallback(() => {
    onShowAllColumns?.()
    onClose()
  }, [onShowAllColumns, onClose])

  const handleSort = useCallback(() => {
    onSort?.()
    onClose()
  }, [onSort, onClose])

  useEffect(() => {
    if (isVisible) {
      function handleClickOutside(event: MouseEvent) {
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
          onClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isVisible, onClose])

  const { portalTarget } = useHighTable()

  if (!isVisible) return null

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Column menu for ${column}`}
      aria-orientation="vertical"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
    >
      <div role="presentation">{column}</div>
      <hr role="separator" />
      <ul role="group" aria-label="Column actions">
        {onHideColumn &&
          <li
            role="menuitem"
            aria-haspopup="false"
            onClick={handleHideColumn}
            aria-disabled={isHideDisabled}
            style={{ opacity: isHideDisabled ? 0.5 : 1, cursor: isHideDisabled ? 'not-allowed' : 'pointer' }}
          >
            Hide column
          </li>
        }
        {onShowAllColumns &&
          <li role="menuitem" aria-haspopup="false" onClick={handleShowAllColumns}>
            Show all columns
          </li>
        }
        {sortable &&
          <>
            <hr role="separator" />
            <li
              role="menuitem"
              aria-haspopup="false"
              aria-checked={direction === 'ascending'}
              onClick={handleSort}
            >
              Sort ascending
            </li>
            <li
              role="menuitem"
              aria-haspopup="false"
              aria-checked={direction === 'descending'}
              onClick={handleSort}
            >
              Sort descending
            </li>
            {direction &&
              <li role="menuitem" aria-haspopup="false" onClick={handleSort}>
                Clear sort
              </li>
            }
          </>
        }
      </ul>
    </div>,
    portalTarget ?? document.body
  )
}
