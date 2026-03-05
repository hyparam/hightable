import { render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { ColumnParametersContext, SortableColumnsContext } from '../../src/contexts/ColumnParametersContext.js'
import { ColumnDescriptorsContext } from '../../src/contexts/DataContext.js'
import type { ColumnConfiguration } from '../../src/helpers/columnConfiguration.js'
import { ColumnParametersProvider } from '../../src/providers/ColumnParametersProvider.js'

function TestComponent() {
  const columnParameters = useContext(ColumnParametersContext)
  const sortableColumns = useContext(SortableColumnsContext)
  return (
    <div>
      <span data-testid="column-parameters">{JSON.stringify(columnParameters)}</span>
      <span data-testid="sortable-columns">{JSON.stringify(Array.from(sortableColumns))}</span>
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
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify([]))
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
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify([]))
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
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify([]))
  })

  it('uses dataframe column descriptor sortable value', () => {
    const columnDescriptors = [
      { name: 'id' },
      { name: 'name', sortable: true },
      { name: 'status' },
    ]
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
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify(['name']))
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
    expect(getByTestId('sortable-columns').textContent).toBe(JSON.stringify([]))
  })
})
