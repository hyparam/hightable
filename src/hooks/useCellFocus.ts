import { useCallback, useContext, useMemo } from 'react'

import { CellNavigationContext } from '../contexts/CellNavigationContext.js'

interface CellData {
  ariaColIndex: number // table column index, same semantic as aria-colindex (1-based, includes row headers)
  ariaRowIndex: number // table row index, same semantic as aria-rowindex (1-based, includes column headers)
}
type TabIndex = -1 | 0
interface CellFocus {
  /** roving tabindex: -1 for all cells except the current navigation cell, which is 0 */
  tabIndex: TabIndex
  /** ref callback to focus the cell if it is the current navigation cell and needs to be focused. Undefined otherwise. */
  focusIfNeeded?: (element: HTMLElement | null) => void
  /** function to set the cell as the current navigation cell */
  navigateToCell: () => void
}

export function useCellFocus({ ariaColIndex, ariaRowIndex }: CellData): CellFocus {
  const { cell, goToCell, focusCurrentCell } = useContext(CellNavigationContext)

  // Check if the cell is the current navigation cell
  const isCurrentCell = ariaColIndex === cell.colIndex && ariaRowIndex === cell.rowIndex

  const focusIfNeeded = useMemo(() => {
    if (isCurrentCell && focusCurrentCell) {
      return (element: HTMLElement | null) => {
        if (element) {
          focusCurrentCell(element)
        }
      }
    }
  }, [isCurrentCell, focusCurrentCell])

  // Roving tabindex: only the current navigation cell is focusable with Tab (tabindex = 0)
  // All other cells are focusable only with javascript .focus() (tabindex = -1)
  const tabIndex = isCurrentCell ? 0 : -1

  const navigateToCell = useCallback(() => {
    goToCell({ colIndex: ariaColIndex, rowIndex: ariaRowIndex })
  }, [goToCell, ariaColIndex, ariaRowIndex])

  return {
    tabIndex,
    focusIfNeeded,
    navigateToCell,
  }
}
