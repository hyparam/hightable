import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ColumnConfiguration } from '../../src/helpers/columnConfiguration'
import { DataFrame } from '../../src/helpers/dataframe/index.js'
import { useTableConfig } from '../../src/hooks/useTableConfig'

afterEach(cleanup)

describe('useTableConfig', () => {
  it('returns parameters in DataFrame column descriptors order', () => {
    const df = {
      columnDescriptors: ['id', 'name', 'status'].map(name => ({ name })),
    } as Pick<DataFrame, 'columnDescriptors'>

    const { result } = renderHook(() => useTableConfig(df, undefined))

    expect(result.current.map(c => c.name)).toEqual(df.columnDescriptors.map(c => c.name))
    expect(result.current.map(c => c.index)).toEqual([0, 1, 2])
  })

  it('merges columnConfiguration props into parameters', () => {
    const df = {
      columnDescriptors: ['id', 'name', 'status'].map(name => ({ name })),
    } as Pick<DataFrame, 'columnDescriptors'>

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.name).toBe('name')
    expect(nameCol.sortable).toBe(false)
    expect(nameCol.headerComponent).toMatchInlineSnapshot(`
      <strong>
        Name
      </strong>
    `)
  })

  it('includes minWidth in column configuration', () => {
    const df = {
      columnDescriptors: ['id', 'name'].map(name => ({ name })),
    } as Pick<DataFrame, 'columnDescriptors'>

    const columnConfiguration: ColumnConfiguration = {
      name: { minWidth: 150 },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.name).toBe('name')
    expect(nameCol.minWidth).toBe(150)
  })

  it('uses dataframe column descriptor sortable value', () => {
    const df = {
      columnDescriptors: [
        { name: 'id' },
        { name: 'name', sortable: true },
        { name: 'status' },
      ],
    } as Pick<DataFrame, 'columnDescriptors'>

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    const [idCol, nameCol] = result.current
    expect(idCol.name).toBe('id')
    expect(idCol.sortable).toBe(false)
    expect(idCol.headerComponent).toBeUndefined()
    expect(nameCol.name).toBe('name')
    expect(nameCol.sortable).toBe(true)
    expect(nameCol.headerComponent).toMatchInlineSnapshot(`
      <strong>
        Name
      </strong>
    `)
  })

  it('ignores configuration keys that are not in DataFrame.columnDescriptors', () => {
    const df = {
      columnDescriptors: [{ name: 'id' }],
    } as Pick<DataFrame, 'columnDescriptors'>
    const columnConfiguration = {
      id: { width: 50 },
      extraneous: { width: 123 },
    } as unknown as ColumnConfiguration // stray key on purpose

    const { result } = renderHook(() =>
      useTableConfig(df, columnConfiguration)
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('id')
  })

  it('returns a stable reference when inputs are unchanged', () => {
    const df = {
      columnDescriptors: [{ name: 'id' }],
    } as Pick<DataFrame, 'columnDescriptors'>

    const { result, rerender } = renderHook(
      ({ d, c }: { d: Pick<DataFrame, 'columnDescriptors'>; c?: ColumnConfiguration }) =>
        useTableConfig(d, c),
      { initialProps: { d: df, c: undefined } }
    )

    const first = result.current
    rerender({ d: df, c: undefined })

    // React memo should give us the same array instance
    expect(result.current).toBe(first)
  })
})
