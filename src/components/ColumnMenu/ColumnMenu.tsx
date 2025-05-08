import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort.js'

interface ColumnMenuProps {
  column: string
  columnIndex: number
  onHideColumn?: (columnIndex: number) => void
  onShowAllColumns?: () => void
  hasHiddenColumns?: boolean
  sortable?: boolean
  direction?: Direction
  onSort?: (columnIndex: number, direction: Direction | null) => void
  isVisible?: boolean
  position: { x: number; y: number }
  onClose: () => void
  visibleHeader?: string[]
}

export default function ColumnMenu({
  column,
  columnIndex,
  onHideColumn,
  onShowAllColumns,
  hasHiddenColumns = false,
  sortable,
  direction,
  onSort,
  isVisible = false,
  position,
  onClose,
  visibleHeader = [],
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleHideColumn = useCallback(() => {
    if (visibleHeader.length <= 1) return
    onHideColumn?.(columnIndex)
    onClose()
  }, [columnIndex, onHideColumn, onClose, visibleHeader.length])

  const handleShowAllColumns = useCallback(() => {
    onShowAllColumns?.()
    onClose()
  }, [onShowAllColumns, onClose])

  const handleSortAscending = useCallback(() => {
    onSort?.(columnIndex, 'ascending')
    onClose()
  }, [columnIndex, onSort, onClose])

  const handleSortDescending = useCallback(() => {
    onSort?.(columnIndex, 'descending')
    onClose()
  }, [columnIndex, onSort, onClose])

  const handleRemoveSort = useCallback(() => {
    onSort?.(columnIndex, null)
    onClose()
  }, [columnIndex, onSort, onClose])

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
        <li
          role="menuitem"
          aria-haspopup="false"
          onClick={handleHideColumn}
          aria-disabled={visibleHeader.length <= 1}
          style={{ opacity: visibleHeader.length <= 1 ? 0.5 : 1, cursor: visibleHeader.length <= 1 ? 'not-allowed' : 'pointer' }}
        >
          Hide column
        </li>
        {hasHiddenColumns &&
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
              onClick={handleSortAscending}
            >
              Sort ascending
            </li>
            <li
              role="menuitem"
              aria-haspopup="false"
              aria-checked={direction === 'descending'}
              onClick={handleSortDescending}
            >
              Sort descending
            </li>
            {direction &&
              <li role="menuitem" aria-haspopup="false" onClick={handleRemoveSort}>
                Clear sort
              </li>
            }
          </>
        }
      </ul>
    </div>,
    document.querySelector('.hightable') ?? document.body
  )
}
