import { fireEvent, render } from '@testing-library/react'
<<<<<<< HEAD:test/hooks/useSelection.test.tsx
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
=======
import { describe, expect, it, vi } from 'vitest'
import { act, useContext } from 'react'
>>>>>>> 4b3fd03 (separate contexts/ and providers/):test/providers/SelectionProvider.test.tsx

import { arrayDataFrame } from '../../src/helpers/dataframe/array.js'
import { SelectionContext } from '../../src/contexts/SelectionContext.js'
import { SelectionProvider } from '../../src/providers/SelectionProvider.js'

function TestComponent() {
  const { allRowsSelected, toggleAllRows, isRowSelected } = useContext(SelectionContext)
  return (
    <div>
      <span data-testid="all-rows-selected">{allRowsSelected ? 'true' : 'false'}</span>
      <button data-testid="toggle-all-rows" onClick={() => toggleAllRows?.()}>Toggle All Rows</button>
      <span data-testid="is-row-0-selected">{isRowSelected?.({ rowNumber: 0 }) ? 'true' : 'false'}</span>
      <span data-testid="is-row-10-selected">{isRowSelected?.({ rowNumber: 10 }) ? 'true' : 'false'}</span>
    </div>
  )
}

describe('SelectionProvider', () => {
  describe('when numRows changes', () => {
    it('recomputes allRowsSelected state', async () => {
      const data = arrayDataFrame(Array.from({ length: 5 }, (_, i) => ({ id: i })))
      const onSelectionChange = vi.fn()
      const { getByTestId, rerender } = render(<SelectionProvider data={data} numRows={5} onSelectionChange={onSelectionChange}>
        <TestComponent />
      </SelectionProvider>)

      expect(getByTestId('all-rows-selected').textContent).toBe('false')
      expect(getByTestId('is-row-0-selected').textContent).toBe('false')
      expect(getByTestId('is-row-10-selected').textContent).toBe('false')

      // select the 5 rows
      // await is required, the sync version does not work
      // eslint-disable-next-line require-await, @typescript-eslint/require-await
      await act(async () => {
        fireEvent.click(getByTestId('toggle-all-rows'))
      })
      expect(onSelectionChange).toHaveBeenCalledExactlyOnceWith(
        { ranges: [{ start: 0, end: 5 }], anchor: undefined }
      )
      expect(getByTestId('all-rows-selected').textContent).toBe('true')
      expect(getByTestId('is-row-0-selected').textContent).toBe('true')
      expect(getByTestId('is-row-10-selected').textContent).toBe('false')

      // increase numRows to 10
      // await is required, the sync version emits a warning
      // eslint-disable-next-line require-await, @typescript-eslint/require-await
      await act(async () => {
        rerender(<SelectionProvider data={data} numRows={10} onSelectionChange={onSelectionChange}>
          <TestComponent />
        </SelectionProvider>)
      })
      expect(getByTestId('all-rows-selected').textContent).toBe('false')
      expect(getByTestId('is-row-0-selected').textContent).toBe('true')
      expect(getByTestId('is-row-10-selected').textContent).toBe('false')
    })
  })
})
