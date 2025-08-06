import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ColumnConfiguration } from '../../src/helpers/columnConfiguration'
import { DataFrame } from '../../src/helpers/dataframe/index.js'
import { useTableConfig } from '../../src/hooks/useTableConfig'

afterEach(cleanup)

describe('useTableConfig', () => {
  it('returns descriptors in DataFrame header order', () => {
    const df = {
      header: ['id', 'name', 'status'],
      sortable: false,
    } as DataFrame

    const { result } = renderHook(() => useTableConfig(df, undefined))

    expect(result.current.map(c => c.key)).toEqual(df.header)
    expect(result.current.map(c => c.index)).toEqual([0, 1, 2])
  })

  it('merges columnConfiguration props into descriptors', () => {
    const df = {
      header: ['id', 'name', 'status'],
      sortable: false,
    } as DataFrame

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.key).toBe('name')
    expect(nameCol.sortable).toBe(false)
    expect(nameCol.headerComponent).toMatchInlineSnapshot(`
      <strong>
        Name
      </strong>
    `)
  })

  it('includes minWidth in column configuration', () => {
    const df = {
      header: ['id', 'name'],
      sortable: false,
    } as DataFrame

    const columnConfiguration: ColumnConfiguration = {
      name: { minWidth: 150 },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.key).toBe('name')
    expect(nameCol.minWidth).toBe(150)
  })

  it('overrides dataframe sortable with column specific value', () => {
    const df = {
      header: ['id', 'name', 'status'],
      sortable: false,
    } as DataFrame

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong>, sortable: true },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.key).toBe('name')
    expect(nameCol.sortable).toBe(true)
    expect(nameCol.headerComponent).toMatchInlineSnapshot(`
      <strong>
        Name
      </strong>
    `)
  })

  it('ignores configuration keys that are not in DataFrame.header', () => {
    const df = {
      header: ['id'],
      sortable: false,
    } as DataFrame
    const columnConfiguration = {
      id: { width: 50 },
      extraneous: { width: 123 },
    } as unknown as ColumnConfiguration // stray key on purpose

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].key).toBe('id')
  })

  it('returns a stable reference when inputs are unchanged', () => {
    const df = {
      header: ['id'],
      sortable: false,
    } as DataFrame

    const { result, rerender } = renderHook(
      ({ d, c }: { d: DataFrame; c?: ColumnConfiguration }) =>
        useTableConfig(d, c),
      { initialProps: { d: df, c: undefined } }
    )

    const first = result.current
    rerender({ d: df, c: undefined })

    // React memo should give us the same array instance
    expect(result.current).toBe(first)
  })
})
