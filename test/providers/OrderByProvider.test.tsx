import { fireEvent, render } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ExclusiveSortContext } from '../../src/contexts/DataContext.js'
import { useColumnOrderBy, useOrderBy, useToggleColumnOrderBy } from '../../src/contexts/OrderByContext.js'
import { OrderByProvider } from '../../src/providers/OrderByProvider.js'

function TestComponent() {
  const orderBy = useOrderBy()
  const { direction, orderByIndex } = useColumnOrderBy('col1')
  const toggleColumnOrderBy = useToggleColumnOrderBy()
  return (
    <div>
      <span data-testid="order-by">{JSON.stringify(orderBy)}</span>
      <span data-testid="col1-direction">{direction}</span>
      <span data-testid="col1-order-by-index">{orderByIndex}</span>
      <button data-testid="toggle-column-col1" onClick={() => toggleColumnOrderBy?.('col1')}>Toggle Col1 Column</button>
      <button data-testid="toggle-column-col2" onClick={() => toggleColumnOrderBy?.('col2')}>Toggle Col2 Column</button>
    </div>
  )
}

describe('OrderByProvider', () => {
  it('provides the orderBy state and helper to get column order', () => {
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
      <OrderByProvider orderBy={initialOrderBy}>
        <TestComponent />
      </OrderByProvider>
    )

    expect(getByTestId('order-by').textContent).toBe(JSON.stringify(initialOrderBy))
    expect(getByTestId('col1-direction').textContent).toBe('ascending')
    expect(getByTestId('col1-order-by-index').textContent).toBe('0')
  })

  it('uses the onOrderByChange callback when the order is toggled', () => {
    const onOrderByChange = vi.fn()
    const { getByTestId } = render(
      <OrderByProvider onOrderByChange={onOrderByChange}>
        <TestComponent />
      </OrderByProvider>
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
        <OrderByProvider>
          <TestComponent />
        </OrderByProvider>
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
          <OrderByProvider>
            <TestComponent />
          </OrderByProvider>
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
              <OrderByProvider>
                <TestComponent />
              </OrderByProvider>
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
  })
})
