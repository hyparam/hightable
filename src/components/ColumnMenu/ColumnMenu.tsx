import { useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import styles from './ColumnMenu.module.css'

interface ColumnMenuProps {
  column: string
  columnIndex: number
  onHideColumn?: (columnIndex: number) => void
  sortable?: boolean
  onSort?: (columnIndex: number) => void
  isVisible?: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export default function ColumnMenu({
  column,
  columnIndex,
  onHideColumn,
  sortable,
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

  const handleSort = useCallback(() => {
    if (onSort) {
      onSort(columnIndex)
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
        {sortable && (
          <li className={styles.columnMenuItem} onClick={handleSort}>
            Sort ascending
          </li>
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
