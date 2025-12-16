import { render, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { act, useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { DataContext } from '../../src/contexts/DataContext.js'
import { arrayDataFrame, DataFrame, DataFrameEvents, Obj } from '../../src/helpers/dataframe/index.js'
import { createEventTarget } from '../../src/helpers/typedEventTarget.js'
import { DataProvider } from '../../src/providers/DataProvider.js'

function createWrapper<M extends Obj, C extends Obj>(props: {
  data: DataFrame<M, C>,
  maxRowNumber?: number
}) {
  return function CreatedWrapper({ children }: { children: ReactNode }) {
    return <DataProvider {...props}>{children}</DataProvider>
  }
}
function TestComponent({ data }: { data: DataFrame }) {
  return <DataProvider data={data}><InnerTestComponent /></DataProvider>
}
function InnerTestComponent() {
  const { key, version, numRows } = useContext(DataContext)
  return <>
    <div data-testid="key">{key}</div>
    <div data-testid="version">{version}</div>
    <div data-testid="numRows">{numRows}</div>
  </>
}

describe('DataProvider', () => {
  it('should provide an empty data frame by default', () => {
    const { data, key, version, maxRowNumber, numRows } = renderHook(() => useContext(DataContext)).result.current
    expect(data.columnDescriptors).toEqual([])
    expect(key).toBe(0)
    expect(data.getRowNumber({ row: 0 })).toBeUndefined()
    expect(() => data.getCell({ row: 0, column: 'a' })).toThrow()
    expect(version).toBe(0)
    expect(maxRowNumber).toBe(0)
    expect(numRows).toBe(0)
  })
  it('should provide the passed dataframe', () => {
    const df = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df }) })
    const { data, key, version, maxRowNumber, numRows } = result.current
    expect(data).toBe(df)
    expect(key).toBe(0)
    expect(version).toBe(0)
    expect(maxRowNumber).toBe(df.numRows)
    expect(numRows).toBe(df.numRows)
  })
  it('should accept a maxRowNumber prop', () => {
    const df = arrayDataFrame([{ a: 1 }, { a: 2 }, { a: 3 }])
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df, maxRowNumber: 10 }) })
    const { maxRowNumber, numRows } = result.current
    expect(numRows).toBe(3)
    expect(maxRowNumber).toBe(10)
  })
  it('should increment version on data resolution', async () => {
    const df = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df }) })
    const initialVersion = result.current.version
    // Simulate data resolution
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      df.eventTarget?.dispatchEvent(new CustomEvent('resolve'))
    })
    const updatedVersion = result.current.version
    expect(updatedVersion).toBe(initialVersion + 1)
  })
  it('should increment version on data update', async () => {
    const df = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df }) })
    const initialVersion = result.current.version
    // Simulate data update
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      df.eventTarget?.dispatchEvent(new CustomEvent('update'))
    })
    const updatedVersion = result.current.version
    expect(updatedVersion).toBe(initialVersion + 1)
  })
  it('should update numRows and keep version unchanged on numrowschange event', async () => {
    const df = {
      numRows: 2,
      eventTarget: createEventTarget<DataFrameEvents>(),
      columnDescriptors: [],
      getRowNumber: () => undefined,
      getCell: () => undefined,
    }
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df }) })
    const initialNumRows = result.current.numRows
    const initialVersion = result.current.version
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      df.numRows = 5
      df.eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
    })
    expect(result.current.numRows).toBe(5)
    expect(result.current.version).toBe(initialVersion)
  })
  it('should update numRows and version when rows are pushed to a dataframe creates with arrayDataFrame', async () => {
    const df = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(() => useContext(DataContext), { wrapper: createWrapper({ data: df }) })
    const initialNumRows = result.current.numRows
    const initialVersion = result.current.version
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      // push 3 rows to the dataframe - arrayDataFrame will emit 'numrowschange' event
      df._array.push({ a: 3 }, { a: 4 }, { a: 5 })
    })
    expect(result.current.numRows).toBe(5)
    // three pushes
    expect(result.current.version).toBe(initialVersion + 3)
  })
  it('should adapt when the data frame has changed', async () => {
    const df1 = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const df2 = arrayDataFrame([{ a: 10 }, { a: 20 }, { a: 30 }])
    const { getByTestId, rerender } = render(<TestComponent data={df1}></TestComponent>)
    expect(getByTestId('key').textContent).toBe('0')
    expect(getByTestId('version').textContent).toBe('0')
    expect(getByTestId('numRows').textContent).toBe('2')
    // Change the data frame
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      rerender(<TestComponent data={df2}></TestComponent>)
    })
    expect(getByTestId('key').textContent).toBe('1')
    expect(getByTestId('version').textContent).toBe('0')
    expect(getByTestId('numRows').textContent).toBe('3')
  })
})
