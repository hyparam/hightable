import { useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Direction } from '../../helpers/sort.js'
import styles from './ColumnMenu.module.css'

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
}: ColumnMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  const handleHideColumn = useCallback(() => {
    if (onHideColumn) {
      onHideColumn(columnIndex)
    }
    onClose()
  }, [columnIndex, onHideColumn, onClose])

  const handleShowAllColumns = useCallback(() => {
    if (onShowAllColumns) {
      onShowAllColumns()
    }
    onClose()
  }, [onShowAllColumns, onClose])

  const handleSortAscending = useCallback(() => {
    if (onSort) {
      onSort(columnIndex, 'ascending')
    }
    onClose()
  }, [columnIndex, onSort, onClose])

  const handleSortDescending = useCallback(() => {
    if (onSort) {
      onSort(columnIndex, 'descending')
    }
    onClose()
  }, [columnIndex, onSort, onClose])

  const handleRemoveSort = useCallback(() => {
    if (onSort) {
      onSort(columnIndex, null)
    }
    onClose()
  }, [columnIndex, onSort, onClose])

  useEffect(() => {
    if (isVisible) {
      const handleClickOutside = (event: MouseEvent) => {
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
      className={styles.columnMenu}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 9999,
      }}
    >
      <div className={styles.columnMenuHeader}>{column}</div>
      <div className={styles.columnMenuDivider} />
      <ul className={styles.columnMenuList}>
        <li className={styles.columnMenuItem} onClick={handleHideColumn}>
          Hide column
        </li>
        {hasHiddenColumns && (
          <li className={styles.columnMenuItem} onClick={handleShowAllColumns}>
            Show all columns
          </li>
        )}
        {sortable && (
          <>
            <div className={styles.columnMenuDivider} />
            <li 
              className={`${styles.columnMenuItem} ${direction === 'ascending' ? styles.activeDirection : ''}`} 
              onClick={handleSortAscending}
            >
              Sort ascending
            </li>
            <li 
              className={`${styles.columnMenuItem} ${direction === 'descending' ? styles.activeDirection : ''}`} 
              onClick={handleSortDescending}
            >
              Sort descending
            </li>
            {direction && (
              <li className={styles.columnMenuItem} onClick={handleRemoveSort}>
                Clear sort
              </li>
            )}
          </>
        )}
        {/* Future menu items can be added here */}
        {/* <li className={styles.columnMenuItem}>
          Show histogram
        </li> */}
      </ul>
    </div>,
    document.body
  )
}
