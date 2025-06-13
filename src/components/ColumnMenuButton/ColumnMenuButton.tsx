import { KeyboardEvent, MouseEvent, ReactNode, useCallback } from 'react'

interface ColumnMenuButtonProps {
  onClick?: (e: MouseEvent | KeyboardEvent) => void
  onEscape?: (e: KeyboardEvent) => void
  tabIndex?: number
  isExpanded?: boolean
  menuId?: string
  disabled?: boolean
  'aria-label'?: string
  icon?: ReactNode
}

export default function ColumnMenuButton({
  onClick,
  onEscape,
  tabIndex = 0,
  isExpanded = false,
  menuId,
  disabled = false,
  'aria-label': ariaLabel = 'Column menu',
  icon = <span aria-hidden='true'>⋮</span>,
}: ColumnMenuButtonProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      e.stopPropagation()
      onClick?.(e)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onEscape?.(e)
    }
  }, [onClick, onEscape])

  const handleClick = useCallback((e: MouseEvent) => {
    onClick?.(e)
  }, [onClick])

  return (
    <button
      type="button"
      onClick={disabled ? undefined : handleClick}
      onKeyDown={disabled ? undefined : handleKeyDown}
      aria-label={ariaLabel}
      aria-haspopup='menu'
      aria-expanded={isExpanded}
      aria-controls={menuId}
      disabled={disabled}
      tabIndex={disabled ? -1 : tabIndex}
    >
      {icon}
    </button>
  )
}
