import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import type { ColumnParameters } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnParametersContext } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnsVisibilityContext } from '../../src/contexts/ColumnsVisibilityContext.js'
import { ColumnsVisibilityProvider } from '../../src/providers/ColumnsVisibilityProvider.js'

function createWrapper(columnParameters: ColumnParameters[]) {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <ColumnParametersContext value={columnParameters}>
        <ColumnsVisibilityProvider>
          {children}
        </ColumnsVisibilityProvider>
      </ColumnParametersContext>
    )
  }
  return Wrapper
}

function useColumnsVisibility() {
  return useContext(ColumnsVisibilityContext)
}

// columnNames, onColumnsVisibilityChange, initialColumnsVisibility
const columnNames = ['column1', 'column2', 'column3']

describe('ColumnsVisibilityProvider', () => {
  it('all the columns are visible by default', () => {
    const columnParameters = columnNames.map((name, index) => ({ name, index, sortable: false }))
    const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper(columnParameters) })
    expect(result.current.numberOfVisibleColumns).toBe(3)
    expect(result.current.isHiddenColumn?.('column1')).toBe(false)
    expect(result.current.isHiddenColumn?.('column2')).toBe(false)
    expect(result.current.isHiddenColumn?.('column3')).toBe(false)
  })
})
