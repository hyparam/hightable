import { useCallback, useContext } from 'react'

import { CellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ScrollModeContext } from '../contexts/ScrollModeContext.js'

interface CellData {
  ariaColIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  ariaRowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0 // roving tabindex: -1 for all cells except the current navigation cell, which is 0
interface CellFocus {
  tabIndex: TabIndex
  focusCellIfNeeded: (element: HTMLElement | null) => void
  navigateToCell: () => void
}

export function useCellFocus({ ariaColIndex, ariaRowIndex }: CellData): CellFocus {
  const { colIndex, rowIndex, setColIndex, setRowIndex, shouldFocus, setShouldFocus } = useContext(CellNavigationContext)
  const { isScrolling } = useContext(ScrollModeContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === colIndex && ariaRowIndex === rowIndex

  const focusCellIfNeeded = useCallback((element: HTMLElement | null) => {
    if (!element || !isCurrentCell || !shouldFocus || isScrolling) {
      return
    }
    // scroll the cell into view (vertically and horizontally) and focus it
    //
    // scroll-padding-inline-start and scroll-padding-block-start are set in the CSS
    // to avoid the cell being hidden by the row and column headers
    //
    // we don't use the simpler form:
    //   element.focus()
    // due to its default scroll behavior. After focusing the elements, it scrolls it into view using `block: center' and
    // `inline: center`. But `block: nearest` and `inline: nearest` feel more natural for navigation. So, we use
    // scrollIntoView first, then focus with `preventScroll: true`.
    element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
    element.focus({ preventScroll: true })
    setShouldFocus(false)
  }, [isCurrentCell, shouldFocus, setShouldFocus, isScrolling])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    setColIndex(ariaColIndex)
    setRowIndex(ariaRowIndex)
    setShouldFocus(true)
    // no need to scroll the row into view here, as the cell is already in the DOM
  }, [setColIndex, setRowIndex, setShouldFocus, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    focusCellIfNeeded,
    navigateToCell,
  }
}
