import { MouseEvent } from 'react'

interface ColumnMenuButtonProps {
  onClick: (e: MouseEvent) => void
}

export default function ColumnMenuButton({ onClick }: ColumnMenuButtonProps) {
  return (
    <div
      onClick={onClick}
      aria-label="Column options"
      role="button"
      tabIndex={-1}
    >
      <span>⋮</span>
    </div>
  )
}
