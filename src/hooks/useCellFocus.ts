import type { RefObject } from 'react'
import { useCallback, useContext, useEffect } from 'react'

import { CellNavigationContext } from '../contexts/CellNavigationContext.js'

interface CellData {
  ref: RefObject<HTMLElement | null> // ref to the HTML element
  ariaColIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  ariaRowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0 // roving tabindex: -1 for all cells except the current navigation cell, which is 0
interface CellFocus {
  tabIndex: TabIndex
  navigateToCell: () => void
}

export function useCellFocus({ ref, ariaColIndex, ariaRowIndex }: CellData): CellFocus {
  const { cellPosition: { colIndex, rowIndex }, setColIndex, setRowIndex, shouldFocus, shouldScrollHorizontally, setShouldScrollHorizontally, setShouldFocus } = useContext(CellNavigationContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === colIndex && ariaRowIndex === rowIndex
  const isHeaderCell = ariaRowIndex === 1 || ariaColIndex === 1

  useEffect(() => {
    // focus on the cell when needed
    const element = ref.current
    if (element && isCurrentCell && shouldFocus) {
      const options = {
        rootMargin: '0px',
        scrollMargin: '0px',
        threshold: 1.0,
      }
      // We need to use IntersectionObserver to ensure that the element is visible, before calling focus()
      // Otherwise, the browser might scroll (even with preventScroll: true!) to bring the element into view
      // But this would break our custom scrolling logic (updates the coarse scroll instead of the virtual scroll).
      const observer = new IntersectionObserver(() => {
        element.focus({ preventScroll: true })
        setShouldFocus?.(false)
        if (shouldScrollHorizontally) {
          // scroll to the cell only if it's not a header cell
          element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
          setShouldScrollHorizontally?.(false)
        }
      }, options)
      observer.observe(element)

      return () => {
        observer.unobserve(element)
        observer.disconnect()
      }
    }
  }, [ref, isCurrentCell, isHeaderCell, shouldScrollHorizontally, shouldFocus, setShouldFocus, setShouldScrollHorizontally])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    setColIndex?.(ariaColIndex)
    setRowIndex?.(ariaRowIndex)
    setShouldFocus?.(true)
    setShouldFocus?.(true)
  }, [setColIndex, setRowIndex, setShouldFocus, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    navigateToCell,
  }
}
