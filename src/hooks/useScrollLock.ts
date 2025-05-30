import { useState } from 'react'

import { useEffect } from 'react'

/**
 * A hook that locks or unlocks scrolling on the document body.
 *
 * This hook is typically used for modals, overlays, or other UI components
 * that should prevent background scrolling when they are open. It manages
 * the document body's overflow style and ensures proper cleanup when the
 * component unmounts.
 *
 * @param isOpen - Boolean indicating whether the scroll should be locked.
 *                 When true, sets document.body.style.overflow to 'hidden'.
 *                 When false, restores the original overflow behavior.
 *
 * @example
 * ```tsx
 * function Modal({ isVisible }: { isVisible: boolean }) {
 *   useScrollLock(isVisible)
 *
 *   return isVisible ? <div>Modal content</div> : null
 * }
 * ```
 */
export function useScrollLock(isOpen: boolean) {
  const [isScrollLocked, setIsScrollLocked] = useState(false)

  useEffect(() => {
    if (isOpen && !isScrollLocked) {
      document.body.style.overflow = 'hidden'
      setIsScrollLocked(true)
    } else if (!isOpen && isScrollLocked) {
      document.body.style.overflow = ''
      setIsScrollLocked(false)
    }
    return () => {
      if (isScrollLocked) {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen, isScrollLocked])
}
