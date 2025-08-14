import { KeyboardEvent, MouseEvent, RefObject, useCallback, useId, useState } from 'react'

export function useColumnMenu(
  ref: RefObject<HTMLTableCellElement | null>,
  navigateToCell: () => void
) {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [isOpen, setIsOpen] = useState(false)
  const menuId = useId()

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleMenuClick = useCallback(
    (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      e.stopPropagation()

      const rect = ref.current?.getBoundingClientRect()
      const buttonRect = e.currentTarget.getBoundingClientRect()

      setPosition({
        left: buttonRect.left,
        top: rect?.bottom ?? 0,
      })

      navigateToCell()
      setIsOpen((current) => !current)
    },
    [ref, navigateToCell]
  )

  return {
    isOpen,
    position,
    menuId,
    close,
    handleMenuClick,
  }
}
