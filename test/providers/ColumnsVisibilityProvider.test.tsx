import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { ColumnsVisibilityContext } from '../../src/contexts/ColumnsVisibilityContext.js'
import { ColumnsVisibilityProvider } from '../../src/providers/ColumnsVisibilityProvider.js'

function createWrapper(props: Omit<React.ComponentProps<typeof ColumnsVisibilityProvider>, 'children'>) {
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <ColumnsVisibilityProvider {...props}>
        {children}
      </ColumnsVisibilityProvider>
    )
  }
  return wrapper
}

function useColumnsVisibility() {
  return useContext(ColumnsVisibilityContext)
}

// columnNames, onColumnsVisibilityChange, initialColumnsVisibility

const columnNames = ['column1', 'column2', 'column3']

describe('ColumnsVisibilityProvider', () => {
  it('all the columns are visible by default', () => {
    const { result } = renderHook(useColumnsVisibility, { wrapper: createWrapper({ columnNames }) })
    expect(result.current.isHiddenColumn?.('column1')).toBe(false)
    expect(result.current.isHiddenColumn?.('column2')).toBe(false)
    expect(result.current.isHiddenColumn?.('column3')).toBe(false)
  })
})
