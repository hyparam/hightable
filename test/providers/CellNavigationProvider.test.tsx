import { fireEvent, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { CellNavigationContext } from '../../src/contexts/CellNavigationContext.js'
import { ColumnVisibilityStatesContext } from '../../src/contexts/ColumnVisibilityStatesContext.js'
import { DataContext } from '../../src/contexts/DataContext.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/index.js'
import { CellNavigationProvider } from '../../src/providers/CellNavigationProvider.js'

function RowCountComponent() {
  const { colIndex, rowIndex, setRowIndex, shouldFocus } = useContext(CellNavigationContext)

  return (
    <div>
      <span data-testid="cell-position">{`col:${colIndex},row:${rowIndex}`}</span>
      <span data-testid="should-focus">{`${shouldFocus}`}</span>
      <button data-testid="set-row-10" onClick={() => { setRowIndex(10) }}>Set Row to 10</button>
    </div>
  )
}
function ColCountComponent() {
  const { colIndex, rowIndex, setColIndex } = useContext(CellNavigationContext)
  return (
    <div>
      <span data-testid="cell-position">{`col:${colIndex},row:${rowIndex}`}</span>
      <button data-testid="set-col-10" onClick={() => { setColIndex(10) }}>Set Col to 10</button>
    </div>
  )
}

function getDefaultDataContext({ numRows}: { numRows: number }) {
  return {
    data: arrayDataFrame([]),
    key: 0,
    version: 0,
    maxRowNumber: 0,
    numRows,
  }
}

describe('CellsNavigationProvider', () => {
  describe('cell index reset on row/col count change', () => {
    it('resets rowIndex if out of bounds when rowCount changes', () => {
      const numberOfVisibleColumns = 4
      const dataContext = getDefaultDataContext({ numRows: 9 })
      const { getByTestId, rerender } = render(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
            <CellNavigationProvider>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const setRow10Button = getByTestId('set-row-10')

      // Initially, rowIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set rowIndex to 10
      fireEvent.click(setRow10Button)
      expect(cellPosition.textContent).toBe('col:1,row:10')

      // Decrease rowCount to 5, which should reset rowIndex to 5
      // Note: we update numRows instead of recreating the context, because it would be considered
      // a new data object and trigger a focus on the first cell
      dataContext.numRows = 4
      rerender(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
            <CellNavigationProvider>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:1,row:5')

      // Increase rowCount to 15, rowIndex should remain 5
      dataContext.numRows = 14
      rerender(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns }}>
            <CellNavigationProvider>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:1,row:5')
    })

    it('resets colIndex if out of bounds when colCount changes', () => {
      const numRows = 9
      const dataContext = getDefaultDataContext({ numRows })
      const { getByTestId, rerender } = render(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 9 }}>
            <CellNavigationProvider>
              <ColCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const setCol10Button = getByTestId('set-col-10')

      // Initially, colIndex should be 1
      expect(cellPosition.textContent).toBe('col:1,row:1')

      // Set colIndex to 10
      fireEvent.click(setCol10Button)
      expect(cellPosition.textContent).toBe('col:10,row:1')

      // Decrease colCount to 5, which should reset colIndex to 5
      rerender(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider>
              <ColCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:5,row:1')

      // Increase rowCount to 15, rowIndex should remain 5
      rerender(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 14 }}>
            <CellNavigationProvider>
              <ColCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )
      expect(cellPosition.textContent).toBe('col:5,row:1')
    })
  })

  describe('focus behavior', () => {
    it('focuses first cell on mount when focus is true', () => {
      const { getByTestId } = render(
        <DataContext.Provider value={getDefaultDataContext({ numRows: 9 })}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={true}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')
      // On mount, the first cell should be focused
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('does not focus first cell on mount when focus is false', () => {
      const { getByTestId } = render(
        <DataContext.Provider value={getDefaultDataContext({ numRows: 9 })}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={false}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
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
        <DataContext.Provider value={getDefaultDataContext({ numRows: 9 })}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')
      // On mount, the first cell should be focused
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('focuses first cell when data changes and focus is true', () => {
      const dataContext = getDefaultDataContext({ numRows: 9 })
      const { getByTestId, rerender } = render(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={true}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')

      // Initial mount
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')

      // Set rowIndex to 10
      const setRow10Button = getByTestId('set-row-10')
      fireEvent.click(setRow10Button)

      // The cell position should be updated
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('true')

      // Change data context to simulate data change
      rerender(
        <DataContext.Provider value={getDefaultDataContext({ numRows: 9 })}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={true}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      // After data change, first cell should be focused again
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('true')
    })

    it('does not focus first cell when data changes and focus is false', () => {
      const dataContext = getDefaultDataContext({ numRows: 9 })
      const { getByTestId, rerender } = render(
        <DataContext.Provider value={dataContext}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={false}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      const cellPosition = getByTestId('cell-position')
      const shouldFocus = getByTestId('should-focus')

      // Initial mount
      expect(cellPosition.textContent).toBe('col:1,row:1')
      expect(shouldFocus.textContent).toBe('false')

      // Set rowIndex to 10
      const setRow10Button = getByTestId('set-row-10')
      fireEvent.click(setRow10Button)

      // The cell position should be updated
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('false')

      // Change data context to simulate data change
      rerender(
        <DataContext.Provider value={getDefaultDataContext({ numRows: 9 })}>
          <ColumnVisibilityStatesContext.Provider value={{ numberOfVisibleColumns: 4 }}>
            <CellNavigationProvider focus={false}>
              <RowCountComponent />
            </CellNavigationProvider>
          </ColumnVisibilityStatesContext.Provider>
        </DataContext.Provider>
      )

      // After data change, cell position should remain unchanged
      expect(cellPosition.textContent).toBe('col:1,row:10')
      expect(shouldFocus.textContent).toBe('false')
    })
  })
})
