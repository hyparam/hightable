import type { ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useReducer } from 'react'

import type { FocusAction, FocusState, MoveCellAction } from '../contexts/CellNavigationContext.js'
import { CellNavigationContext } from '../contexts/CellNavigationContext.js'
import { ColumnsVisibilityContext } from '../contexts/ColumnsVisibilityContext.js'
import { defaultNumRowsPerPage } from '../helpers/constants.js'
import { useInputState } from '../hooks/useInputState.js'
import type { HighTableProps } from '../types.js'

type CellNavigationProviderProps = Pick<HighTableProps, 'cellPosition' | 'focus' | 'numRowsPerPage' | 'onCellPositionChange'> & {
  /** The actual number of rows in the data frame */
  numRows: number
  /** Children elements */
  children: ReactNode
}

function reducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case 'START':
      return { status: 'should_scroll_into_view', counter: 0 }
    case 'CANNOT_SCROLL_YET':
    case 'LOCAL_SCROLLING_STARTED':
      // one extra render is needed for local scrolling, or at start if the scroll parameters are not ready yet
      // To avoid infinite loops in case of unexpected issues, we use a counter to stop trying to scroll after 3 attempts (2 should be enough).
      if (state.counter >= 3) {
        // console.warn('Cannot scroll to the cell after 5 attempts. To avoid infinite loops, try to focus it now.')
        return { status: 'should_focus', counter: 0 }
      }
      return { ...state, counter: state.counter + 1 }
    case 'GLOBAL_SCROLLING_STARTED':
      return { status: 'scrolling_into_view', counter: 0 }
    case 'SCROLLED_EVENT_RECEIVED':
      return state.status === 'scrolling_into_view' ? { status: 'should_scroll_into_view', counter: 0 } : state
    case 'NO_NEED_TO_SCROLL':
      return { status: 'should_focus', counter: 0 }
    case 'FOCUSED':
      return { status: 'idle', counter: 0 }
  }
}

function initializeFocusState(focus: boolean): FocusState {
  const state = { counter: 0, status: 'idle' as const }
  return focus ? reducer(state, { type: 'START' }) : state
}

/**
 * Provide the cell navigation state and logic to the table, through the CellNavigationContext.
 */
export function CellNavigationProvider({
  cellPosition: controlledCellPosition,
  focus = true,
  numRows: numDataRows,
  numRowsPerPage = defaultNumRowsPerPage,
  onCellPositionChange,
  children,
}: CellNavigationProviderProps) {
  const [focusState, focusDispatch] = useReducer(reducer, focus, initializeFocusState)

  const notifyChange = useCallback(() => {
    focusDispatch({ type: 'START' })
  }, [])

  // restart scroll + focus process when the cell position changes,
  // to ensure the cell is scrolled into view and focused when it changes,
  // even from an external source (e.g. clicking on a cell, or updating the cell position from an external source)
  const [cellPosition, goToCell] = useInputState({
    controlledValue: controlledCellPosition,
    onChange: onCellPositionChange,
    initialUncontrolledValue: { colIndex: 1, rowIndex: 1 },
    notifyChange,
  })

  // number of rows in the table, including the header row
  const rowCount = useMemo(() => numDataRows + 1, [numDataRows])

  // number of columns in the table, including the row header column
  const { numberOfVisibleColumns: numDataColumns } = useContext(ColumnsVisibilityContext)
  const colCount = useMemo(() => numDataColumns + 1, [numDataColumns])

  const goToCurrentCell = useCallback(() => {
    // force set
    goToCell?.({ ...cellPosition })
  }, [goToCell, cellPosition])

  const goToFirstCell = useMemo(() => {
    if (goToCell) {
      return () => {
        goToCell({ colIndex: 1, rowIndex: 1 })
      }
    }
  }, [goToCell])

  useEffect(() => {
    if (
      cellPosition.rowIndex < 1
      || cellPosition.rowIndex > rowCount
      || cellPosition.colIndex < 1
      || cellPosition.colIndex > colCount
    ) {
      // move the cell inside the bounds (if possible)
      goToCell?.({
        colIndex: Math.min(Math.max(cellPosition.colIndex, 1), colCount),
        rowIndex: Math.min(Math.max(cellPosition.rowIndex, 1), rowCount),
      })
    }
  }, [cellPosition, rowCount, colCount, goToCell])

  const focusCurrentCell = useMemo(() => {
    if (focusState.status === 'should_focus') {
      return (element: HTMLElement) => {
        // horizontally scroll the cell into view and focus it, once the row is rendered and scrolled into view vertically
        // vertical scrolling happens automatically in ScrollProvider's useEffect when cellPosition changes
        //
        // scroll-padding-inline-start is set in the CSS
        // to avoid the cell being hidden by the row headers
        //
        // we don't use the simpler form:
        //   element.focus()
        // due to its default scroll behavior. After focusing the elements, it scrolls it into view using `inline: center`.
        // But `inline: nearest` feels more natural for navigation. So, we use scrollIntoView first, then focus with `preventScroll: true`.
        element.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' })
        element.focus({ preventScroll: true })
        focusDispatch({ type: 'FOCUSED' })
      }
    }
  }, [focusState])

  const moveCell = useMemo(() => {
    if (goToCell) {
      const { rowIndex, colIndex } = cellPosition
      return (action: MoveCellAction) => {
        switch (action.type) {
          case 'LAST_COLUMN': {
            goToCell({ colIndex: colCount, rowIndex })
            break
          }
          case 'NEXT_COLUMN': {
            const newColIndex = colIndex < colCount ? colIndex + 1 : colCount
            goToCell({ colIndex: newColIndex, rowIndex })
            break
          }
          case 'FIRST_COLUMN': {
            goToCell({ colIndex: 1, rowIndex })
            break
          }
          case 'PREVIOUS_COLUMN': {
            const newColIndex = colIndex > 1 ? colIndex - 1 : 1
            goToCell({ colIndex: newColIndex, rowIndex })
            break
          }
          case 'LAST_ROW': {
            goToCell({ colIndex, rowIndex: rowCount })
            break
          }
          case 'NEXT_ROW': {
            const newRowIndex = rowIndex < rowCount ? rowIndex + 1 : rowCount
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'FIRST_ROW': {
            goToCell({ colIndex, rowIndex: 1 })
            break
          }
          case 'PREVIOUS_ROW': {
            const newRowIndex = rowIndex > 1 ? rowIndex - 1 : 1
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'FIRST_CELL': {
            goToCell({ colIndex: 1, rowIndex: 1 })
            break
          }
          case 'LAST_CELL': {
            goToCell({ colIndex: colCount, rowIndex: rowCount })
            break
          }
          case 'NEXT_ROWS_PAGE': {
            const newRowIndex = Math.min(rowIndex + numRowsPerPage, rowCount)
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'PREVIOUS_ROWS_PAGE': {
            const newRowIndex = Math.max(rowIndex - numRowsPerPage, 1)
            goToCell({ colIndex, rowIndex: newRowIndex })
            break
          }
          case 'CELL': {
            goToCell({ colIndex: action.colIndex, rowIndex: action.rowIndex })
            break
          }
        }
      }
    }
  }, [cellPosition, goToCell, colCount, rowCount, numRowsPerPage])

  const value = useMemo(() => {
    return {
      cellPosition,
      colCount,
      rowCount,
      focusCurrentCell,
      moveCell,
      goToFirstCell,
      goToCurrentCell,
      focusState,
      focusDispatch,
    }
  }, [cellPosition, colCount, rowCount, focusCurrentCell, moveCell, goToFirstCell, goToCurrentCell, focusState, focusDispatch])

  return (
    <CellNavigationContext.Provider value={value}>
      {children}
    </CellNavigationContext.Provider>
  )
}
