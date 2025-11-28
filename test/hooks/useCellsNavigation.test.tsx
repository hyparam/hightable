import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { CellsNavigationProvider, useCellsNavigation } from '../../src/hooks/useCellsNavigation.js'

function TestComponent() {
  const { cellPosition, setRowIndex } = useCellsNavigation()
  return (
    <div>
      <span data-testid="cell-position">{`col:${cellPosition.colIndex},row:${cellPosition.rowIndex}`}</span>
      <button data-testid="set-row-10" onClick={() => setRowIndex?.(10)}>Set Row to 10</button>
    </div>
  )
}

describe('useCellsNavigation', () => {
  describe('when rowCount changes', () => {
    it('resets rowIndex if out of bounds', () => {
      const { getByTestId, rerender } = render(<CellsNavigationProvider colCount={5} rowCount={10} rowPadding={3}>
        <TestComponent />
      </CellsNavigationProvider>)

      const cellPosition = getByTestId('cell-position')
      const setRow10Button = getByTestId('set-row-10')

      // Initially, rowIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set rowIndex to 10
      fireEvent.click(setRow10Button)
      expect(cellPosition.textContent).toBe('col:1,row:10')

      // Decrease rowCount to 5, which should reset rowIndex to 5
      rerender(<CellsNavigationProvider colCount={5} rowCount={5} rowPadding={3}>
        <TestComponent />
      </CellsNavigationProvider>)
      expect(cellPosition.textContent).toBe('col:1,row:5')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(<CellsNavigationProvider colCount={5} rowCount={15} rowPadding={3}>
        <TestComponent />
      </CellsNavigationProvider>)
      expect(cellPosition.textContent).toBe('col:1,row:5')
    })
  })
})
