import { MouseEvent } from 'react'
import styles from './ColumnMenuButton.module.css'

interface ColumnMenuButtonProps {
  onClick: (e: MouseEvent) => void
}

export default function ColumnMenuButton({ onClick }: ColumnMenuButtonProps) {
  return (
    <div
      className={styles.columnMenuButton}
      onClick={onClick}
      aria-label="Column options"
      role="button"
      tabIndex={0}
    >
      <span className={styles.menuIcon}>⋮</span>
    </div>
  )
}
