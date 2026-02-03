import { fireEvent, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { CellNavigationContext } from '../../src/contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../../src/contexts/ColumnVisibilityStatesContext.js'
import { CellNavigationProvider } from '../../src/providers/CellNavigationProvider.js'

function RowCountComponent() {
  const { cell: { colIndex, rowIndex }, goToCell, focusCurrentCell } = useContext(CellNavigationContext)

  return (
    <div>
      <span data-testid="cell-position">{`col:${colIndex},row:${rowIndex}`}</span>
      <span data-testid="should-focus">{`${focusCurrentCell !== undefined}`}</span>
      <button data-testid="go-to-row-10" onClick={() => { goToCell({ colIndex, rowIndex: 10 }) }}>Set Row to 10</button>
      <button
        data-testid="remove-focus"
        onClick={() => {
          // jsdom does not provide scrollIntoView
          const element = document.body
          element.scrollIntoView = () => { /* no-op */ }
          focusCurrentCell?.(element)
        }}
      >
        Remove focus
      </button>
    </div>
  )
}
function ColCountComponent() {
  const { cell: { colIndex, rowIndex }, goToCell } = useContext(CellNavigationContext)
  return (
    <div>
      <span data-testid="cell-position">{`col:${colIndex},row:${rowIndex}`}</span>
      <button data-testid="go-to-col-10" onClick={() => { goToCell({ colIndex: 10, rowIndex }) }}>Set Col to 10</button>
    </div>
  )
}

describe('CellsNavigationProvider', () => {
  describe('cell index reset on row/col count change', () => {
    it('resets rowIndex if out of bounds when rowCount changes', () => {
      const numberOfVisibleColumns = 4
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={9}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const setRow10Button = getByTestId('go-to-row-10')

      // Initially, rowIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set rowIndex to 10
      fireEvent.click(setRow10Button)
      expect(cellPosition.textContent).toBe('col:1,row:10')

      // Decrease rowCount to 5, which should reset rowIndex to 5
      // Note: we update numRows instead of recreating the context, because it would be considered
      // a new data object and trigger a focus on the first cell
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={4}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:1,row:5')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={14}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:1,row:5')
    })

    it('resets colIndex if out of bounds when colCount changes', () => {
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 9 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const setCol10Button = getByTestId('go-to-col-10')

      // Initially, colIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set colIndex to 10
      fireEvent.click(setCol10Button)
      expect(cellPosition.textContent).toBe('col:10,row:1')

      // Decrease colCount to 5, which should reset colIndex to 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:5,row:1')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 14 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:5,row:1')
    })
  })

  describe('focus behavior', () => {
    it('focuses first cell on mount when focus is true', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true} dataId={0}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')
      // On mount, the first cell should be focused
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('does not focus first cell on mount when focus is false', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={false}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')
      // On mount, the cell position should remain at default (1,1)
      expect(cellPosition.textContent).toBe('col:1,row:1')
      // and should not be focused
      expect(shouldFocus.textContent).toBe('false')
    })

    it('defaults focus to true on mount', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} dataId={0}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')
      // On mount, the first cell should be focused
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('focuses first cell when data changes and focus is true', () => {
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true} dataId={0}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')

      // Initial mount
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')

      // Set rowIndex to 10
      const setRow10Button = getByTestId('go-to-row-10')
      fireEvent.click(setRow10Button)

      // The cell position should be updated
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('true')

      // Change dataId to simulate data change
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true} dataId={1}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // After data change, first cell should be focused again
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('does not focus first cell when data changes and focus is false', () => {
      const numberOfVisibleColumns = 4
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={9} focus={false} dataId={0}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')

      // Initial mount
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('false')

      // Set rowIndex to 10
      const setRow10Button = getByTestId('go-to-row-10')
      fireEvent.click(setRow10Button)

      // The cell position should be updated
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('true')
      // Remove focus
      const removeFocusButton = getByTestId('remove-focus')
      fireEvent.click(removeFocusButton)
      expect(shouldFocus.textContent).toBe('false')

      // Change dataId to simulate data change
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={9} focus={false} dataId={1}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // After data change, cell position should remain unchanged
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('false')
    })
  })
})
