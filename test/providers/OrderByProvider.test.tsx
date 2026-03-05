import { fireEvent, render } from '@testing-library/react'
import { act, useContext } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { SortableColumnsContext } from '../../src/contexts/ColumnParametersContext.js'
import { ExclusiveSortContext } from '../../src/contexts/DataContext.js'
import { OrderByContext, SortInfoAndActionsByColumnContext } from '../../src/contexts/OrderByContext.js'
import { OrderByProvider } from '../../src/providers/OrderByProvider.js'

function TestComponent() {
  const orderBy = useContext(OrderByContext)
  const sortInfoAndActionsByColumn = useContext(SortInfoAndActionsByColumnContext)
  return (
    <div>
      <span data-testid="order-by">{JSON.stringify(orderBy)}</span>
      <span data-testid="col1-direction">{sortInfoAndActionsByColumn.get('col1')?.sortInfo?.direction ?? ''}</span>
      <span data-testid="col1-order-by-index">{sortInfoAndActionsByColumn.get('col1')?.sortInfo?.index ?? ''}</span>
      <button data-testid="toggle-column-col1" onClick={() => sortInfoAndActionsByColumn.get('col1')?.toggleOrderBy?.()}>Toggle Col1 Column</button>
      <button data-testid="toggle-column-col2" onClick={() => sortInfoAndActionsByColumn.get('col2')?.toggleOrderBy?.()}>Toggle Col2 Column</button>
    </div>
  )
}

describe('OrderByProvider', () => {
  it('provides an empty orderBy array by default', () => {
    const { getByTestId } = render(
      <OrderByProvider>
        <TestComponent />
      </OrderByProvider>
    )

    expect(getByTestId('order-by').textContent).toBe('[]')
    expect(getByTestId('col1-direction').textContent).toBe('')
    expect(getByTestId('col1-order-by-index').textContent).toBe('')
  })

  it('provides the orderBy state passed to the provider', () => {
    const initialOrderBy = [{ column: 'col1', direction: 'ascending' as const }]
    const { getByTestId } = render(
      <SortableColumnsContext.Provider value={new Set(['col1', 'col2'])}>
        <OrderByProvider orderBy={initialOrderBy}>
          <TestComponent />
        </OrderByProvider>
      </SortableColumnsContext.Provider>
    )

    expect(getByTestId('order-by').textContent).toBe(JSON.stringify(initialOrderBy))
    expect(getByTestId('col1-direction').textContent).toBe('ascending')
    expect(getByTestId('col1-order-by-index').textContent).toBe('0')
  })

  it('removes the columns that are not sortable from the orderBy state and logs a warning', () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => void 0)
    const initialOrderBy = [{ column: 'col1', direction: 'ascending' as const }, { column: 'col2', direction: 'descending' as const }]
    const { getByTestId } = render(
      <SortableColumnsContext.Provider value={new Set(['col2'])}>
        <OrderByProvider orderBy={initialOrderBy}>
          <TestComponent />
        </OrderByProvider>
      </SortableColumnsContext.Provider>
    )

    expect(getByTestId('order-by').textContent).toBe(JSON.stringify([{ column: 'col2', direction: 'descending' }]))
    expect(getByTestId('col1-direction').textContent).toBe('')
    expect(getByTestId('col1-order-by-index').textContent).toBe('')
    expect(consoleWarnSpy).toHaveBeenCalledWith('Column "col1" is in orderBy but is not sortable. It will be ignored. Fix the orderBy state or set the column as sortable.')
    consoleWarnSpy.mockRestore()
  })

  it('uses the onOrderByChange callback when the order is toggled', () => {
    const onOrderByChange = vi.fn()
    const { getByTestId } = render(
      <SortableColumnsContext.Provider value={new Set(['col1', 'col2'])}>
        <OrderByProvider onOrderByChange={onOrderByChange}>
          <TestComponent />
        </OrderByProvider>
      </SortableColumnsContext.Provider>
    )

    const toggleButton = getByTestId('toggle-column-col1')
    act(() => {
      fireEvent.click(toggleButton)
    })
    expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'col1', direction: 'ascending' }])
  })

  describe('toggleColumnOrderBy', () => {
    it('toggles the order of a column between ascending, descending and no order', () => {
      const { getByTestId } = render(
        <SortableColumnsContext.Provider value={new Set(['col1', 'col2'])}>
          <OrderByProvider>
            <TestComponent />
          </OrderByProvider>
        </SortableColumnsContext.Provider>
      )

      const toggleButton = getByTestId('toggle-column-col1')

      act(() => {
        fireEvent.click(toggleButton)
      })
      expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"ascending"}]')
      expect(getByTestId('col1-direction').textContent).toBe('ascending')
      expect(getByTestId('col1-order-by-index').textContent).toBe('0')

      act(() => {
        fireEvent.click(toggleButton)
      })
      expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"descending"}]')
      expect(getByTestId('col1-direction').textContent).toBe('descending')
      expect(getByTestId('col1-order-by-index').textContent).toBe('0')

      act(() => {
        fireEvent.click(toggleButton)
      })
      expect(getByTestId('order-by').textContent).toBe('[]')
      expect(getByTestId('col1-direction').textContent).toBe('')
      expect(getByTestId('col1-order-by-index').textContent).toBe('')
    })

    describe('when a different column is toggled', () => {
      it('sets the new column to ascending order (no matter its previous direction) as the new first entry in orderBy', () => {
        const { getByTestId } = render(
          <SortableColumnsContext.Provider value={new Set(['col1', 'col2'])}>
            <OrderByProvider>
              <TestComponent />
            </OrderByProvider>
          </SortableColumnsContext.Provider>
        )

        const toggleCol1Button = getByTestId('toggle-column-col1')
        const toggleCol2Button = getByTestId('toggle-column-col2')

        act(() => {
          fireEvent.click(toggleCol1Button)
        })
        expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"ascending"}]')

        act(() => {
          fireEvent.click(toggleCol2Button)
        })
        expect(getByTestId('order-by').textContent).toBe('[{"column":"col2","direction":"ascending"},{"column":"col1","direction":"ascending"}]')

        act(() => {
          fireEvent.click(toggleCol1Button)
        })
        expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"ascending"},{"column":"col2","direction":"ascending"}]')
      })

      describe('in exclusiveSort mode', () => {
        it('sets the new column to ascending order as the only entry in orderBy', () => {
          const { getByTestId } = render(
            <ExclusiveSortContext.Provider value={true}>
              <SortableColumnsContext.Provider value={new Set(['col1', 'col2'])}>
                <OrderByProvider>
                  <TestComponent />
                </OrderByProvider>
              </SortableColumnsContext.Provider>
            </ExclusiveSortContext.Provider>
          )

          const toggleCol1Button = getByTestId('toggle-column-col1')
          const toggleCol2Button = getByTestId('toggle-column-col2')

          act(() => {
            fireEvent.click(toggleCol1Button)
          })
          expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"ascending"}]')

          act(() => {
            fireEvent.click(toggleCol2Button)
          })
          expect(getByTestId('order-by').textContent).toBe('[{"column":"col2","direction":"ascending"}]')

          act(() => {
            fireEvent.click(toggleCol1Button)
          })
          expect(getByTestId('order-by').textContent).toBe('[{"column":"col1","direction":"ascending"}]')
        })
      })
    })

    describe('if the column is not sortable', () => {
      it('does not toggle the order of the column', () => {
        const onOrderByChange = vi.fn()
        const { getByTestId } = render(
          <SortableColumnsContext.Provider value={new Set(['col2'])}>
            <OrderByProvider onOrderByChange={onOrderByChange}>
              <TestComponent />
            </OrderByProvider>
          </SortableColumnsContext.Provider>
        )

        const toggleCol1Button = getByTestId('toggle-column-col1')

        act(() => {
          fireEvent.click(toggleCol1Button)
        })
        expect(getByTestId('order-by').textContent).toBe('[]')
        expect(onOrderByChange).not.toHaveBeenCalled()
      })
    })

    it('removes all non-sortable columns from the orderBy state when toggling a column', () => {
      const orderBy = [{ column: 'col1', direction: 'ascending' as const }, { column: 'col2', direction: 'ascending' as const }, { column: 'col3', direction: 'descending' as const }]
      const onOrderByChange = vi.fn()
      const { getByTestId } = render(
        // col1 is in orderBy, but is not sortable. It will be removed when toggling col2
        <SortableColumnsContext.Provider value={new Set(['col2', 'col3'])}>
          <OrderByProvider orderBy={orderBy} onOrderByChange={onOrderByChange}>
            <TestComponent />
          </OrderByProvider>
        </SortableColumnsContext.Provider>
      )

      const toggleCol2Button = getByTestId('toggle-column-col2')
      act(() => {
        fireEvent.click(toggleCol2Button)
      })
      expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'col2', direction: 'descending' }, { column: 'col3', direction: 'descending' }])
    })
  })
})
