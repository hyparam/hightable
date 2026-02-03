import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it } from 'vitest'

import type { DataFrameEvents } from '../../src/helpers/dataframe/index.js'
import { arrayDataFrame } from '../../src/helpers/dataframe/index.js'
import { createEventTarget } from '../../src/helpers/typedEventTarget.js'
import { useData } from '../../src/hooks/useData.js'

describe('useData', () => {
  it('should provide the passed dataframe', () => {
    const data = arrayDataFrame([{ a: 1, b: 2 }, { a: 3, b: 4 }])
    const { result } = renderHook(useData, { initialProps: { data } })
    const { dataId, version, numRows } = result.current
    expect(data).toBe(data)
    expect(dataId).toBe(0)
    expect(version).toBe(0)
    expect(numRows).toBe(data.numRows)
  })
  it('should increment version on data resolution', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(useData, { initialProps: { data } })
    const initialVersion = result.current.version
    // Simulate data resolution
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.eventTarget?.dispatchEvent(new CustomEvent('resolve'))
    })
    const updatedVersion = result.current.version
    expect(updatedVersion).toBe(initialVersion + 1)
  })
  it('should increment version on data update', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(useData, { initialProps: { data } })
    const initialVersion = result.current.version
    // Simulate data update
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.eventTarget?.dispatchEvent(new CustomEvent('update'))
    })
    const updatedVersion = result.current.version
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
    const { result } = renderHook(useData, { initialProps: { data } })
    const initialNumRows = result.current.numRows
    const initialVersion = result.current.version
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      data.numRows = 5
      data.eventTarget.dispatchEvent(new CustomEvent('numrowschange'))
    })
    expect(result.current.numRows).toBe(5)
    expect(result.current.version).toBe(initialVersion)
  })
  it('should update numRows and version when rows are pushed to a dataframe creates with arrayDataFrame', async () => {
    const data = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const { result } = renderHook(useData, { initialProps: { data } })
    const initialNumRows = result.current.numRows
    const initialVersion = result.current.version
    expect(initialNumRows).toBe(2)
    expect(initialVersion).toBe(0)
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      // push 3 rows to the dataframe - arrayDataFrame will emit 'numrowschange' event
      data._array.push({ a: 3 }, { a: 4 }, { a: 5 })
    })
    expect(result.current.numRows).toBe(5)
    // three pushes
    expect(result.current.version).toBe(initialVersion + 3)
  })
  it('should adapt when the data frame has changed', async () => {
    const data1 = arrayDataFrame([{ a: 1 }, { a: 2 }])
    const data2 = arrayDataFrame([{ a: 10 }, { a: 20 }, { a: 30 }])
    const { result, rerender } = renderHook(useData, { initialProps: { data: data1 } })
    expect(result.current).toEqual({
      dataId: 0,
      version: 0,
      numRows: 2,
    })
    // Change the data frame
    // eslint-disable-next-line @typescript-eslint/require-await
    await act(async () => {
      rerender({ data: data2 })
    })
    expect(result.current).toEqual({
      dataId: 1,
      version: 0,
      numRows: 3,
    })
  })
})
