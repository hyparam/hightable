import {
  KeyboardEvent,
  MouseEvent,
  RefObject,
  useCallback,
  useRef,
} from 'react'

interface ColumnMenuButtonProps {
  onClick?: (e: MouseEvent) => void
  buttonRef?: RefObject<HTMLDivElement | null>
  tabIndex?: number
}

export default function ColumnMenuButton({
  onClick,
  buttonRef,
  tabIndex = 0,
}: ColumnMenuButtonProps) {
  const internalRef = useRef<HTMLDivElement>(null)
  const ref = buttonRef ?? internalRef

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopPropagation()

        // Create a synthetic mouse event with position information from the button
        if (ref.current && onClick) {
          const rect = ref.current.getBoundingClientRect()
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
    [onClick, ref]
  )

  return (
    <div
      ref={ref}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      aria-label='Column Menu Button'
      role='button'
      tabIndex={tabIndex}
    >
      <span>⋮</span>
    </div>
  )
}
