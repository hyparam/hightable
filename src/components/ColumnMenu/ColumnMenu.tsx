import { useCallback, useRef } from 'react'
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

  if (!isVisible) return null

  return (
    <div
      ref={menuRef}
      className={styles.columnMenu}
      style={{
        position: 'absolute',
        top: position.y,
        left: position.x,
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
    </div>
  )
}
