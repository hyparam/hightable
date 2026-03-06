import { render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { ColumnParametersContext } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnDescriptorsContext } from '../../src/contexts/DataContext.js'
import type { ColumnConfiguration } from '../../src/helpers/columnConfiguration.js'
import { ColumnParametersProvider } from '../../src/providers/ColumnParametersProvider.js'

function TestComponent() {
  const columnParameters = useContext(ColumnParametersContext)
  return (
    <div>
      <span data-testid="column-parameters">{JSON.stringify(columnParameters)}</span>
    </div>
  )
}

describe('ColumnParametersProvider', () => {
  it('returns parameters in DataFrame column descriptors order', () => {
    const columnDescriptors = ['id', 'name', 'status'].map(name => ({ name }))

    const { getByTestId } = render(
      <ColumnDescriptorsContext.Provider value={columnDescriptors}>
        <ColumnParametersProvider>
          <TestComponent />
        </ColumnParametersProvider>
      </ColumnDescriptorsContext.Provider>
    )

    expect(getByTestId('column-parameters').textContent).toBe(JSON.stringify([
      { name: 'id', index: 0 },
      { name: 'name', index: 1 },
      { name: 'status', index: 2 },
    ]))
  })

  it('merges columnConfiguration props into parameters', () => {
    const columnDescriptors = ['id', 'name', 'status'].map(name => ({ name }))
    const headerComponent = <strong>Name</strong>
    const columnConfiguration: ColumnConfiguration = {
      name: { headerComponent },
    }

    const { getByTestId } = render(
      <ColumnDescriptorsContext.Provider value={columnDescriptors}>
        <ColumnParametersProvider columnConfiguration={columnConfiguration}>
          <TestComponent />
        </ColumnParametersProvider>
      </ColumnDescriptorsContext.Provider>
    )

    expect(getByTestId('column-parameters').textContent).toBe(JSON.stringify([
      { name: 'id', index: 0 },
      { name: 'name', index: 1, headerComponent },
      { name: 'status', index: 2 },
    ]))
  })

  it('includes minWidth in column configuration', () => {
    const columnDescriptors = ['id', 'name'].map(name => ({ name }))
    const columnConfiguration: ColumnConfiguration = {
      name: { minWidth: 150 },
    }

    const { getByTestId } = render(
      <ColumnDescriptorsContext.Provider value={columnDescriptors}>
        <ColumnParametersProvider columnConfiguration={columnConfiguration}>
          <TestComponent />
        </ColumnParametersProvider>
      </ColumnDescriptorsContext.Provider>
    )

    expect(getByTestId('column-parameters').textContent).toBe(JSON.stringify([
      { name: 'id', index: 0 },
      { name: 'name', index: 1, minWidth: 150 },
    ]))
  })

  it('ignores configuration keys that are not in DataFrame.columnDescriptors', () => {
    const columnDescriptors = [{ name: 'id' }]
    const columnConfiguration = {
      id: { width: 50 },
      extraneous: { width: 123 },
    } as unknown as ColumnConfiguration // stray key on purpose

    const { getByTestId } = render(
      <ColumnDescriptorsContext.Provider value={columnDescriptors}>
        <ColumnParametersProvider columnConfiguration={columnConfiguration}>
          <TestComponent />
        </ColumnParametersProvider>
      </ColumnDescriptorsContext.Provider>
    )

    expect(getByTestId('column-parameters').textContent).toBe(JSON.stringify([
      { name: 'id', index: 0, width: 50 },
    ]))
  })
})
