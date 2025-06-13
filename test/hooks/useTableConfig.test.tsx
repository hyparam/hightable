import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'

import { useTableConfig } from '../../src/hooks/useTableConfig'
import { ColumnConfiguration } from '../../src/helpers/columnConfiguration'

afterEach(cleanup)

describe('useTableConfig', () => {
  it('returns descriptors in DataFrame header order', () => {
    const header = ['id', 'name', 'status']

    const { result } = renderHook(() => useTableConfig(header, undefined))

    expect(result.current.map(c => c.key)).toEqual(header)
    expect(result.current.map(c => c.index)).toEqual([0, 1, 2])
  })

  it('merges columnConfiguration props into descriptors', () => {
    const header = ['id', 'name']
    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent: <strong>Name</strong> },
    }

    const { result } = renderHook(() =>
      useTableConfig(header, columnConfiguration)
    )

    const [, nameCol] = result.current
    expect(nameCol.key).toBe('name')
    expect(nameCol.headerComponent).toMatchInlineSnapshot(`
      <strong>
        Name
      </strong>
    `)
  })

  it('ignores configuration keys that are not in DataFrame.header', () => {
    const header = ['id']
    const columnConfiguration = {
      id: { width: 50 },
      extraneous: { width: 123 },
    } as unknown as ColumnConfiguration // stray key on purpose

    const { result } = renderHook(() =>
      useTableConfig(header, columnConfiguration)
    )

    expect(result.current).toHaveLength(1)
    expect(result.current[0].key).toBe('id')
  })

  it('returns a stable reference when inputs are unchanged', () => {
    const header = ['id']

    const { result, rerender } = renderHook(
      ({ h, c }: { h: string[]; c?: ColumnConfiguration }) =>
        useTableConfig(h, c),
      { initialProps: { h: header, c: undefined } }
    )

    const first = result.current
    rerender({ h: header, c: undefined })

    // React memo should give us the same array instance
    expect(result.current).toBe(first)
  })
})
