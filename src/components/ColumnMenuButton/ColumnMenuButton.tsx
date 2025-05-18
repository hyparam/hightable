import { KeyboardEvent, MouseEvent, useCallback, useRef } from 'react'

interface ColumnMenuButtonProps {
  onClick?: (e: MouseEvent) => void
}

export default function ColumnMenuButton({ onClick }: ColumnMenuButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()

        // Create a synthetic mouse event with position information from the button
        if (buttonRef.current && onClick) {
          const rect = buttonRef.current.getBoundingClientRect()
          const syntheticEvent = {
            ...e,
            clientX: rect.left + rect.width / 2,
            stopPropagation: () => {
              e.stopPropagation()
            },
          } as unknown as MouseEvent

          onClick(syntheticEvent)
        }
      }
    },
    [onClick]
  )

  return (
    <div
      ref={buttonRef}
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
