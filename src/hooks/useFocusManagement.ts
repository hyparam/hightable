import { RefObject, useCallback, useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

/**
 * A hook that manages focus behavior for interactive UI components like menus or modals.
 *
 * This hook handles focus management by storing the previously focused element when
 * a component opens, focusing the first focusable element within the component,
 * and restoring focus to the original element when the component closes. This is
 * essential for accessibility and keyboard navigation.
 *
 * @param isOpen - Boolean indicating whether the component is open.
 *                 When true, captures current focus and moves focus to the first
 *                 focusable element in the menu. When false, restores focus to
 *                 the previously focused element.
 * @param menuRef - React ref object pointing to the container element that
 *                  contains the focusable elements to manage.
 *
 * @returns An object containing:
 *   - getFocusableElements: Function that returns all focusable elements
 *     within the menu container using the standard focusable selector.
 *
 * @example
 * ```tsx
 * function DropdownMenu({ isOpen }: { isOpen: boolean }) {
 *   const menuRef = useRef<HTMLDivElement>(null)
 *   const { getFocusableElements } = useFocusManagement(isOpen, menuRef)
 *
 *   return (
 *     <div ref={menuRef}>
 *       <button>Option 1</button>
 *       <button>Option 2</button>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFocusManagement(
  isOpen: boolean,
  menuRef: RefObject<HTMLDivElement | null>
) {
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const getFocusableElements = useCallback(() => {
    return menuRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []
  }, [menuRef])

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      const focusableElements = getFocusableElements()
      if (focusableElements.length) {
        const firstElement = focusableElements[0] as HTMLElement
        requestAnimationFrame(() => {
          firstElement.focus()
        })
      }
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus()
      previousFocusRef.current = null
    }
  }, [isOpen, getFocusableElements])

  const navigateFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last') => {
    const focusableElements = getFocusableElements()
    if (!focusableElements.length) return

    const { activeElement } = document
    if (!activeElement) return

    const currentIndex = Array.from(focusableElements).indexOf(activeElement)
    let nextIndex: number

    switch (direction) {
    case 'first':
      nextIndex = 0
      break
    case 'last':
      nextIndex = focusableElements.length - 1
      break
    case 'next':
      nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
      break
    case 'previous':
      nextIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
      break
    }

    const nextElement = focusableElements[nextIndex]
    if (nextElement instanceof HTMLElement) {
      nextElement.focus()
    }
  }, [getFocusableElements])

  return { getFocusableElements, navigateFocus }
}
