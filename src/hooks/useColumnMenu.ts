import { KeyboardEvent, MouseEvent, RefObject, useCallback, useState } from 'react'

export function useColumnMenu(
  columnIndex: number,
  ref: RefObject<HTMLTableCellElement | null>,
  navigateToCell: () => void
) {
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const [isOpen, setIsOpen] = useState(false)
  const menuId = `column-menu-label-${columnIndex}`

  const handleToggle = useCallback(() => {
    setIsOpen((current) => !current)
  }, [])

  const handleMenuClick = useCallback(
    (e: MouseEvent | KeyboardEvent) => {
      e.stopPropagation()

      const rect = ref.current?.getBoundingClientRect()
      const buttonRect = (
        e.currentTarget as HTMLElement
      ).getBoundingClientRect()

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
    handleToggle,
    handleMenuClick,
  }
}
