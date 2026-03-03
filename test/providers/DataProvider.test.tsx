import { render } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'

import { useDataVersion, useNumRows } from '../../src/contexts/DataContext.js'
import type { DataFrame, DataFrameEvents } from '../../src/helpers/dataframe/index.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/index.js'
import { createEventTarget } from '../../src/helpers/typedEventTarget.js'
import { DataProvider } from '../../src/providers/DataProvider.js'

function DisplayComponent() {
  const dataVersion = useDataVersion()
  const numRows = useNumRows()

  return (
    <div>
      <span data-testid="data-version">{dataVersion}</span>
      <span data-testid="num-rows">{numRows}</span>
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
  })
  it('should increment version on data resolution', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { getByTestId } = render(<TestComponent data={data} />)
    const initialVersion = Number(getByTestId('data-version').textContent)
    // Simulate data resolution
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.eventTarget?.dispatchEvent(new CustomEvent('resolve'))
    })
    const updatedVersion = Number(getByTestId('data-version').textContent)
    expect(updatedVersion).toBe(initialVersion + 1)
  })
  it('should increment version on data update', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { getByTestId } = render(<TestComponent data={data} />)
    const initialVersion = Number(getByTestId('data-version').textContent)
    // Simulate data update
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.eventTarget?.dispatchEvent(new CustomEvent('update'))
    })
    const updatedVersion = Number(getByTestId('data-version').textContent)
    expect(updatedVersion).toBe(initialVersion + 1)
  })
  it('should update numRows and keep version unchanged on numrowschange event', async () => {
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
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.numRows = 5
      data.eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
    })
    const updatedNumRows = Number(getByTestId('num-rows').textContent)
    const updatedVersion = Number(getByTestId('data-version').textContent)
    expect(updatedNumRows).toBe(5)
    expect(updatedVersion).toBe(initialVersion)
  })
  it('should update numRows and version when rows are pushed to a dataframe creates with arrayDataFrame', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { getByTestId } = render(<TestComponent data={data} />)

    const initialNumRows = Number(getByTestId('num-rows').textContent)
    const initialVersion = Number(getByTestId('data-version').textContent)
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
  })
})
