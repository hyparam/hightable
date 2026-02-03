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

      // Initially, rowIndex should be 1
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')

      // Set rowIndex to 10
      fireEvent.click(getByTestId('go-to-row-10'))
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:10')

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
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:5')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={14}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:5')
    })

    it('resets colIndex if out of bounds when colCount changes', () => {
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 9 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // Initially, colIndex should be 1
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')

      // Set colIndex to 10
      fireEvent.click(getByTestId('go-to-col-10'))
      expect(getByTestId('cell-position').textContent).toBe('col:10,row:1')

      // Decrease colCount to 5, which should reset colIndex to 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(getByTestId('cell-position').textContent).toBe('col:5,row:1')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 14 }}>
          <CellNavigationProvider numRows={9}>
            <ColCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )
      expect(getByTestId('cell-position').textContent).toBe('col:5,row:1')
    })
  })

  describe('focus behavior', () => {
    it('focuses first cell on mount when focus is true', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // On mount, the first cell should be focused
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('true')
    })

    it('does not focus first cell on mount when focus is false', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={false}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // On mount, the cell position should remain at default (1,1)
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      // and should not be focused
      expect(getByTestId('should-focus').textContent).toBe('false')
    })

    it('defaults focus to true on mount', () => {
      const { getByTestId } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // On mount, the first cell should be focused
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('true')
    })

    it('focuses first cell when data changes and focus is true', () => {
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // Initial mount
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('true')

      // Set rowIndex to 10
      fireEvent.click(getByTestId('go-to-row-10'))

      // The cell position should be updated
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:10')
      expect(getByTestId('should-focus').textContent).toBe('true')

      // Change key to simulate data change
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
          <CellNavigationProvider numRows={9} focus={true} key="new-data">
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // After data change, first cell should be focused again
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('true')
    })

    it('does not focus first cell when data changes and focus is false', () => {
      const numberOfVisibleColumns = 4
      const { getByTestId, rerender } = render(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={9} focus={false}>
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // Initial mount
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('false')

      // Set rowIndex to 10
      fireEvent.click(getByTestId('go-to-row-10'))

      // The cell position should be updated
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:10')
      expect(getByTestId('should-focus').textContent).toBe('true')
      // Remove focus
      const removeFocusButton = getByTestId('remove-focus')
      fireEvent.click(removeFocusButton)
      expect(getByTestId('should-focus').textContent).toBe('false')

      // Change key to simulate data change
      rerender(
        <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
          <CellNavigationProvider numRows={9} focus={false} key="new-data">
            <RowCountComponent />
          </CellNavigationProvider>
        </ColumnVisibilityStatesContext.Provider>
      )

      // After data change, cell position has been reset, but it's not focused
      expect(getByTestId('cell-position').textContent).toBe('col:1,row:1')
      expect(getByTestId('should-focus').textContent).toBe('false')
    })
  })
})
