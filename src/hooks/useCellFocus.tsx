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
  const { cellPosition: { colIndex, rowIndex }, setColIndex, setRowIndex, shouldFocus, setShouldFocus } = useContext(CellNavigationContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === colIndex && ariaRowIndex === rowIndex
  const isHeaderCell = ariaRowIndex === 1 || ariaColIndex === 1

  useEffect(() => {
    // focus on the cell when needed
    if (ref.current && isCurrentCell && shouldFocus) {
      if (!isHeaderCell) {
        // scroll the cell into view
        //
        // scroll-padding-inline-start and scroll-padding-block-start are set in the CSS
        // to avoid the cell being hidden by the row and column headers
        //
        // not applied for header cells, as they are always visible, and it was causing jumps when resizing a column
        ref.current.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
      }
      ref.current.focus()
      setShouldFocus?.(false)
    }
  }, [ref, isCurrentCell, isHeaderCell, shouldFocus, setShouldFocus])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    setColIndex?.(ariaColIndex)
    setRowIndex?.(ariaRowIndex)
    setShouldFocus?.(true)
  }, [setColIndex, setRowIndex, setShouldFocus, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    navigateToCell,
  }
}
