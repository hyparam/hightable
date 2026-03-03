import { render } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'

import { useDataKey, useDataVersion, useNumColumns, useNumRows } from '../../src/contexts/DataContext.js'
import type { DataFrame, DataFrameEvents } from '../../src/helpers/dataframe/index.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/index.js'
import { createEventTarget } from '../../src/helpers/typedEventTarget.js'
import { DataProvider } from '../../src/providers/DataProvider.js'

function DisplayComponent() {
  const dataKey = useDataKey()
  const dataVersion = useDataVersion()
  const numRows = useNumRows()
  const numColumns = useNumColumns()

  return (
    <div>
      <span data-testid="data-key">{dataKey}</span>
      <span data-testid="data-version">{dataVersion}</span>
      <span data-testid="num-rows">{numRows}</span>
      <span data-testid="num-columns">{numColumns}</span>
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
  it('should provide the passed dataframe', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const { getByTestId } = render(<TestComponent data={data} />)
    expect(getByTestId('data-version').textContent).toBe('0')
    expect(getByTestId('num-rows').textContent).toBe(data.numRows.toString())
    expect(getByTestId('num-columns').textContent).toBe(data.columnDescriptors.length.toString())
  })
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
  it('should update numRows and version when rows are pushed to a dataframe created with arrayDataFrame, but keep the same key', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { getByTestId } = render(<TestComponent data={data} />)

    const initialNumRows = Number(getByTestId('num-rows').textContent)
    const initialVersion = Number(getByTestId('data-version').textContent)
    const key = getByTestId('data-key').textContent
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      // push 3 rows to the dataframe - arrayDataFrame will emit 'numrowschange' event
      data._array.push({ a: 3 }, { a: 4 }, { a: 5 })
    })
    const updatedNumRows = Number(getByTestId('num-rows').textContent)
    const updatedVersion = Number(getByTestId('data-version').textContent)
    expect(updatedNumRows).toBe(5)
    // three pushes
    expect(updatedVersion).toBe(initialVersion + 3)
    expect(getByTestId('data-key').textContent).toBe(key)
  })
  it('should remount and change the key when the data frame has changed', async () => {
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
  it('should provide the initial number of columns from the data frame, not the current one, if changed', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const { getByTestId, rerender } = render(<TestComponent data={data} />)
    expect(getByTestId('num-columns').textContent).toBe(data.columnDescriptors.length.toString())
    // Change the number of columns in the data frame
    data.columnDescriptors.push({ name: 'c' })
    // force a re-render without changing the data frame instance
    rerender(<TestComponent data={data} />)
    expect(getByTestId('num-columns').textContent).toBe('2')
  })
})
