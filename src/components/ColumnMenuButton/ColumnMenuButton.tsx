import { KeyboardEvent, MouseEvent, useCallback } from 'react'

interface ColumnMenuButtonProps {
  onClick?: (e: MouseEvent) => void
}

export default function ColumnMenuButton({ onClick }: ColumnMenuButtonProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onClick?.(e as unknown as MouseEvent)
    }
  }, [onClick])

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label='Column Menu Button'
      role='button'
      tabIndex={0}
    >
      <span>⋮</span>
    </div>
  )
}
