import { fireEvent, render } from '@testing-library/react'
import { act, useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { DataFrameMethodsContext, NumRowsContext } from '../../src/contexts/DataContext.js'
import { SelectionContext } from '../../src/contexts/SelectionContext.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/array.js'
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
      const { getByTestId, rerender } = render(
        <DataFrameMethodsContext.Provider value={data}>
          <NumRowsContext.Provider value={5}>
            <SelectionProvider onSelectionChange={onSelectionChange}>
              <TestComponent />
            </SelectionProvider>
          </NumRowsContext.Provider>
        </DataFrameMethodsContext.Provider>
      )

      expect(getByTestId('all-rows-selected').textContent).toBe('false')
      expect(getByTestId('is-row-0-selected').textContent).toBe('false')
      expect(getByTestId('is-row-10-selected').textContent).toBe('false')

      // select the 5 rows
      // await is required, the sync version does not work
      // eslint-disable-next-line @typescript-eslint/require-await
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
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        rerender(
          <DataFrameMethodsContext.Provider value={data}>
            <NumRowsContext.Provider value={10}>
              <SelectionProvider onSelectionChange={onSelectionChange}>
                <TestComponent />
              </SelectionProvider>
            </NumRowsContext.Provider>
          </DataFrameMethodsContext.Provider>
        )
      })
      expect(getByTestId('all-rows-selected').textContent).toBe('false')
      expect(getByTestId('is-row-0-selected').textContent).toBe('true')
      expect(getByTestId('is-row-10-selected').textContent).toBe('false')
    })
  })
})
