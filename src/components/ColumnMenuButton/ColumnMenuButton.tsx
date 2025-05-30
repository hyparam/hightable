import { KeyboardEvent, MouseEvent, ReactNode, forwardRef, useCallback } from 'react'

interface ColumnMenuButtonProps {
  onClick?: (e: MouseEvent | KeyboardEvent) => void
  tabIndex?: number
  isExpanded?: boolean
  menuId?: string
  disabled?: boolean
  'aria-label'?: string
  icon?: ReactNode
}

const ColumnMenuButton = forwardRef<HTMLDivElement, ColumnMenuButtonProps>(
  (
    {
      onClick,
      tabIndex = 0,
      isExpanded = false,
      menuId,
      disabled = false,
      'aria-label': ariaLabel = 'Column menu',
      icon = <span aria-hidden='true'>⋮</span>,
    },
    ref
  ) => {
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
          e.preventDefault()
          e.stopPropagation()
          onClick?.(e)
        }
      },
      [onClick, disabled]
    )

    const handleClick = useCallback(
      (e: MouseEvent) => {
        if (!disabled) {
          onClick?.(e)
        }
      },
      [onClick, disabled]
    )

    return (
      <div
        ref={ref}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-haspopup='menu'
        aria-expanded={isExpanded}
        aria-controls={menuId}
        aria-disabled={disabled}
        role='button'
        tabIndex={disabled ? -1 : tabIndex}
      >
        {icon}
      </div>
    )
  }
)

ColumnMenuButton.displayName = 'ColumnMenuButton'

export default ColumnMenuButton
