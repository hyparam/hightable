import { KeyboardEvent, MouseEvent, ReactNode, forwardRef, useCallback } from 'react'

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

const ColumnMenuButton = forwardRef<HTMLButtonElement, ColumnMenuButtonProps>(
  (
    {
      onClick,
      onEscape,
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
        if (disabled) return

        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onClick?.(e)
        } else if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onEscape?.(e)
        }
      },
      [onClick, onEscape, disabled]
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
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
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
)

// To avoid showing ForwardRef in dev tools error messages:
// > The above error occurred in the <ForwardRef> component
ColumnMenuButton.displayName = 'ColumnMenuButton'

export default ColumnMenuButton
