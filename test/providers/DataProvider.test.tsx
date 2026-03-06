import { render } from '@testing-library/react'
import { act, useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ColumnNamesContext, DataFrameMethodsContext, DataKeyContext, DataVersionContext, ExclusiveSortContext, NumRowsContext, SortableColumnsContext } from '../../src/contexts/DataContext.js'
import type { DataFrame, DataFrameEvents } from '../../src/helpers/dataframe/index.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/index.js'
import { createEventTarget } from '../../src/helpers/typedEventTarget.js'
import { DataProvider } from '../../src/providers/DataProvider.js'

function DisplayComponent() {
  const dataKey = useContext(DataKeyContext)
  const dataVersion = useContext(DataVersionContext)
  const numRows = useContext(NumRowsContext)
  const columnNames = useContext(ColumnNamesContext)
  const sortableColumns = useContext(SortableColumnsContext)
  const exclusiveSort = useContext(ExclusiveSortContext) ? 'true' : 'false'
  const dataFrameMethods = useContext(DataFrameMethodsContext)

  return (
    <div>
      <span data-testid="data-key">{dataKey}</span>
      <span data-testid="data-version">{dataVersion}</span>
      <span data-testid="num-rows">{numRows}</span>
      <span data-testid="column-names">{JSON.stringify(columnNames)}</span>
      <span data-testid="sortable-columns">{JSON.stringify(Array.from(sortableColumns))}</span>
      <span data-testid="exclusive-sort">{exclusiveSort}</span>
      <button
        data-testid="get-cell"
        onClick={() => {
          dataFrameMethods.getCell({ row: 0, column: 'col1' })
        }}
      >
        Get Cell
      </button>
      <button
        data-testid="get-row-number"
        onClick={() => {
          dataFrameMethods.getRowNumber({ row: 0 })
        }}
      >
        Get Row Number
      </button>
      <button
        data-testid="fetch"
        onClick={() => {
          void dataFrameMethods.fetch?.({ rowStart: 0, rowEnd: 10 })
        }}
      >
        Fetch Rows
      </button>
    </div>
  )
}

function TestComponent({ data }: { data: DataFrame }) {
  return (
    <DataProvider data={data}>
      <DisplayComponent />
    </DataProvider>
  )
}

describe('DataProvider', () => {
  it('should provide the passed data frame', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const { getByTestId } = render(<TestComponent data={data} />)
    expect(getByTestId('data-version').textContent).toBe('0')
    expect(getByTestId('num-rows').textContent).toBe(data.numRows.toString())
    expect(getByTestId('column-names').textContent).toBe(JSON.stringify(['a', 'b']))
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify([]))
    expect(getByTestId('exclusive-sort').textContent).toBe('false')
  })

  it('should be able to call the data frame methods from the context', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    data.getCell = vi.fn()
    data.getRowNumber = vi.fn()
    data.fetch = vi.fn().mockResolvedValue(undefined)
    const { getByTestId } = render(<TestComponent data={data} />)
    act(() => {
      getByTestId('get-cell').click()
    })
    expect(data.getCell).toHaveBeenCalledWith({ row: 0, column: 'col1' })
    act(() => {
      getByTestId('get-row-number').click()
    })
    expect(data.getRowNumber).toHaveBeenCalledWith({ row: 0 })
    act(() => {
      getByTestId('fetch').click()
    })
    expect(data.fetch).toHaveBeenCalledWith({ rowStart: 0, rowEnd: 10 })
  })

  it('uses the current data frame methods, even if they change after the initial render', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const getCell1 = vi.fn()
    const getCell2 = vi.fn()
    data.getCell = getCell1
    const { getByTestId, rerender } = render(<TestComponent data={data} />)
    act(() => {
      getByTestId('get-cell').click()
    })
    expect(getCell1).toHaveBeenCalledWith({ row: 0, column: 'col1' })

    // Change the getCell method in the data frame
    data.getCell = getCell2
    // force a re-render without changing the data frame instance
    rerender(<TestComponent data={data} />)
    act(() => {
      getByTestId('get-cell').click()
    })
    expect(getCell2).toHaveBeenCalledWith({ row: 0, column: 'col1' })
  })

  describe('on observable data frame change', () => {
    it('should increment version on data resolution, but keep the same key', async () => {
      const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
      const { getByTestId } = render(<TestComponent data={data} />)
      const initialVersion = Number(getByTestId('data-version').textContent)
      const key = getByTestId('data-key').textContent
      // Simulate data resolution
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        data.eventTarget?.dispatchEvent(new CustomEvent('resolve'))
      })
      const updatedVersion = Number(getByTestId('data-version').textContent)
      expect(updatedVersion).toBe(initialVersion + 1)
      expect(getByTestId('data-key').textContent).toBe(key)
    })
    it('should increment version on data update, but keep the same key', async () => {
      const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
      const { getByTestId } = render(<TestComponent data={data} />)
      const initialVersion = Number(getByTestId('data-version').textContent)
      const key = getByTestId('data-key').textContent
      // Simulate data update
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        data.eventTarget?.dispatchEvent(new CustomEvent('update'))
      })
      const updatedVersion = Number(getByTestId('data-version').textContent)
      expect(updatedVersion).toBe(initialVersion + 1)
      expect(getByTestId('data-key').textContent).toBe(key)
    })
    it('should update numRows and keep version and key unchanged on numrowschange event', async () => {
      const data = {
        numRows: 2,
        eventTarget: createEventTarget<DataFrameEvents>(),
        columnDescriptors: [],
        getRowNumber: () => undefined,
        getCell: () => undefined,
      }
      const { getByTestId } = render(<TestComponent data={data} />)
      const initialNumRows = Number(getByTestId('num-rows').textContent)
      const initialVersion = Number(getByTestId('data-version').textContent)
      const key = getByTestId('data-key').textContent
      expect(initialNumRows).toBe(2)
      expect(initialVersion).toBe(0)
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        data.numRows = 5
        data.eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
      })
      const updatedNumRows = Number(getByTestId('num-rows').textContent)
      const updatedVersion = Number(getByTestId('data-version').textContent)
      const updatedKey = getByTestId('data-key').textContent
      expect(updatedNumRows).toBe(5)
      expect(updatedVersion).toBe(initialVersion)
      expect(updatedKey).toBe(key)
    })
    it('should update numRows and version when rows are pushed to a data frame created with arrayDataFrame, but keep the same key', async () => {
      const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
      const { getByTestId } = render(<TestComponent data={data} />)

      const initialNumRows = Number(getByTestId('num-rows').textContent)
      const initialVersion = Number(getByTestId('data-version').textContent)
      const key = getByTestId('data-key').textContent
      expect(initialNumRows).toBe(2)
      expect(initialVersion).toBe(0)
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
      // push 3 rows to the data frame - arrayDataFrame will emit 'numrowschange' event
        data._array.push({ a: 3 }, { a: 4 }, { a: 5 })
      })
      const updatedNumRows = Number(getByTestId('num-rows').textContent)
      const updatedVersion = Number(getByTestId('data-version').textContent)
      expect(updatedNumRows).toBe(5)
      // three pushes
      expect(updatedVersion).toBe(initialVersion + 3)
      expect(getByTestId('data-key').textContent).toBe(key)
    })
  })

  describe('on unobservable data frame change', () => {
    it('should provide the initial column names', () => {
      const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
      const { getByTestId, rerender } = render(<TestComponent data={data} />)
      const initialColumnNames = JSON.stringify(['a', 'b'])
      expect(getByTestId('column-names').textContent).toBe(initialColumnNames)
      // Change the column descriptors in the data frame
      data.columnDescriptors.push({ name: 'c', sortable: true })
      if (data.columnDescriptors[0] === undefined) {
        throw new Error('Not enough column descriptors')
      }
      data.columnDescriptors[0].name = 'x'
      // force a re-render without changing the data frame instance
      rerender(<TestComponent data={data} />)
      expect(getByTestId('column-names').textContent).toBe(initialColumnNames)
    })
    it('should provide the initial sortable columns based on column descriptors', () => {
      const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
      if (data.columnDescriptors[0] === undefined || data.columnDescriptors[1] === undefined) {
        throw new Error('Not enough column descriptors')
      }
      data.columnDescriptors[0].sortable = true
      const { getByTestId, rerender } = render(<TestComponent data={data} />)
      expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify(['a']))
      // Change the sortable property of the column descriptors in the data frame
      data.columnDescriptors[1].sortable = true
      // force a re-render without changing the data frame instance
      rerender(<TestComponent data={data} />)
      expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify(['a']))
    })
    it('should provide the initial exclusiveSort value', () => {
      const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
      data.exclusiveSort = true
      const { getByTestId, rerender } = render(<TestComponent data={data} />)
      expect(getByTestId('exclusive-sort').textContent).toBe('true')
      // Change the exclusiveSort value in the data frame
      data.exclusiveSort = false
      // force a re-render without changing the data frame instance
      rerender(<TestComponent data={data} />)
      expect(getByTestId('exclusive-sort').textContent).toBe('true')
    })
  })

  describe('on data frame instance change', () => {
    it('should change the key and reset the contexts', async () => {
      const data1 = arrayDataFrame([{ a: 1 }, { a: 2 }])
      const data2 = arrayDataFrame([{ a: 10 }, { a: 20 }, { a: 30 }])
      const { getByTestId, rerender } = render(<TestComponent data={data1} />)
      const initialKey = getByTestId('data-key').textContent
      expect(getByTestId('data-version').textContent).toBe('0')
      expect(getByTestId('num-rows').textContent).toBe('2')
      // Change the data frame
      // eslint-disable-next-line @typescript-eslint/require-await
      await act(async () => {
        rerender(<TestComponent data={data2} />)
      })
      expect(getByTestId('data-version').textContent).toBe('0')
      expect(getByTestId('num-rows').textContent).toBe('3')
      expect(getByTestId('data-key').textContent).not.toBe(initialKey)
    })
  })
})
