import { cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'

import { ColumnConfiguration } from '../../src/helpers/columnConfiguration.js'
import { ColumnDescriptor } from '../../src/helpers/dataframe/index.js'
import { ColumnParametersProvider, useColumnParameters } from '../../src/hooks/useColumnParameters.js'

afterEach(cleanup)

function createWrapper(columnDescriptors: ColumnDescriptor[], columnConfiguration?: ColumnConfiguration) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <ColumnParametersProvider columnDescriptors={columnDescriptors} columnConfiguration={columnConfiguration}>
        {children}
      </ColumnParametersProvider>
    )
  }
  return wrapper
}

describe('useColumnParameters', () => {
  it('returns parameters in DataFrame column descriptors order', () => {
    const columnDescriptors = ['id', 'name', 'status'].map(name => ({ name }))

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors) }
    )

    expect(result.current.map(c => c.name)).toEqual(columnDescriptors.map(c => c.name))
    expect(result.current.map(c => c.index)).toEqual([0, 1, 2])
  })

  it('merges columnConfiguration props into parameters', () => {
    const columnDescriptors = ['id', 'name', 'status'].map(name => ({ name }))

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors, columnConfiguration) }
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
    const columnDescriptors = ['id', 'name'].map(name => ({ name }))

    const columnConfiguration: ColumnConfiguration = {
      name: { minWidth: 150 },
    }

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors, columnConfiguration) }
    )

    const [, nameCol] = result.current
    expect(nameCol.name).toBe('name')
    expect(nameCol.minWidth).toBe(150)
  })

  it('uses dataframe column descriptor sortable value', () => {
    const columnDescriptors = [
      { name: 'id' },
      { name: 'name', sortable: true },
      { name: 'status' },
    ]

    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors, columnConfiguration) }
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
    const columnDescriptors = [{ name: 'id' }]
    const columnConfiguration = {
      id: { width: 50 },
      extraneous: { width: 123 },
    } as unknown as ColumnConfiguration // stray key on purpose

    const { result } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors, columnConfiguration) }
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].name).toBe('id')
  })

  it('returns a stable reference when inputs are unchanged', () => {
    const columnDescriptors = [{ name: 'id' }]

    const { result, rerender } = renderHook(
      () => useColumnParameters(),
      { wrapper: createWrapper(columnDescriptors) }
    )

    const first = result.current
    rerender()

    // React memo should give us the same array instance
    expect(result.current).toBe(first)
  })
})
