import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { ColumnConfiguration } from '../../src/helpers/columnConfiguration.js'
import { DataFrame } from '../../src/helpers/dataframe/index.js'
import { ColumnParametersProvider, useColumnParameters } from '../../src/hooks/useColumnParameters.js'

afterEach(cleanup)

function createWrapper(data: Pick<DataFrame, 'columnDescriptors'>, columnConfiguration?: ColumnConfiguration) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <ColumnParametersProvider data={data} columnConfiguration={columnConfiguration}>
        {children}
      </ColumnParametersProvider>
    )
  }
  return wrapper
}

describe('useColumnParameters', () => {
  it('returns parameters in DataFrame column descriptors order', () => {
    const df = {
      columnDescriptors: ['id', 'name', 'status'].map(name => ({ name })),
    } as Pick<DataFrame, 'columnDescriptors'>

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df) }
    )

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

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df, columnConfiguration) }
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

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df, columnConfiguration) }
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

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df, columnConfiguration) }
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

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df, columnConfiguration) }
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('id')
  })

  it('returns a stable reference when inputs are unchanged', () => {
    const df = {
      columnDescriptors: [{ name: 'id' }],
    } as Pick<DataFrame, 'columnDescriptors'>

    const { result, rerender } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(df) }
    )

    const first = result.current
    rerender()

    // React memo should give us the same array instance
    expect(result.current).toBe(first)
  })
})
