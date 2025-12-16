import { fireEvent, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { CellNavigationContext } from '../../src/contexts/CellNavigationContext.js'
import { CellNavigationProvider } from '../../src/providers/CellNavigationProvider.js'

function TestComponent() {
  const { cellPosition, setRowIndex } = useContext(CellNavigationContext)
  return (
    <div>
      <span data-testid="cell-position">{`col:${cellPosition.colIndex},row:${cellPosition.rowIndex}`}</span>
      <button data-testid="set-row-10" onClick={() => setRowIndex?.(10)}>Set Row to 10</button>
    </div>
  )
}

describe('CellsNavigationProvider', () => {
  describe('when rowCount changes', () => {
    it('resets rowIndex if out of bounds', () => {
      const { getByTestId, rerender } = render(<CellNavigationProvider colCount={5} rowCount={10} rowPadding={3}>
        <TestComponent />
      </CellNavigationProvider>)

      const cellPosition = getByTestId('cell-position')
      const setRow10Button = getByTestId('set-row-10')

      // Initially, rowIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set rowIndex to 10
      fireEvent.click(setRow10Button)
      expect(cellPosition.textContent).toBe('col:1,row:10')

      // Decrease rowCount to 5, which should reset rowIndex to 5
      rerender(<CellNavigationProvider colCount={5} rowCount={5} rowPadding={3}>
        <TestComponent />
      </CellNavigationProvider>)
      expect(cellPosition.textContent).toBe('col:1,row:5')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(<CellNavigationProvider colCount={5} rowCount={15} rowPadding={3}>
        <TestComponent />
      </CellNavigationProvider>)
      expect(cellPosition.textContent).toBe('col:1,row:5')
    })
  })
})
