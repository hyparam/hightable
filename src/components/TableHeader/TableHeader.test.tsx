import type { ReactNode } from 'react'
import { within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render as _render } from '../../utils/userEvent.js'
import TableHeader from './TableHeader.js'
import { usePortalContainer } from '../../hooks/usePortalContainer.js'

function ContainerProvider({ children }: { children: ReactNode }) {
  const { containerRef } = usePortalContainer()
  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}
function render(jsx: ReactNode) {
  return _render(
    <ContainerProvider>
      {jsx}
    </ContainerProvider>
  )
}

describe('TableHeader', () => {
  const columnsParameters = [{ name: 'Name', index: 0, sortable: true }, { name: 'Age', index: 1, sortable: true }, { name: 'Address', index: 2, sortable: true }]
  const canMeasureWidth = true

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    const { getByText } = render(<table><thead><tr>
      <TableHeader
        canMeasureWidth={canMeasureWidth}
        columnsParameters={columnsParameters}
        ariaRowIndex={1}
      />
    </tr></thead></table>)
    columnsParameters.forEach(descriptor => {
      getByText(descriptor.name)
    })
  })

  it('sets orderBy to the column name (ascending order) when a header is clicked', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        columnsParameters={columnsParameters}
        orderBy={[]}
        onOrderByChange={onOrderByChange}
        canMeasureWidth={canMeasureWidth}
        ariaRowIndex={1}
      />
    </tr></thead></table>)

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'Age', direction: 'ascending' }])
  })

  it('sets orderBy to the column name (descending order) when a header is clicked if it was already sorted by ascending order', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        columnsParameters={columnsParameters}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'ascending' }]}
        canMeasureWidth={canMeasureWidth}
        ariaRowIndex={1}
      />
    </tr></thead></table>)

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'Age', direction: 'descending' }])
  })

  it('sets orderBy to undefined when a header is clicked if it was already sorted by descending order', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        columnsParameters={columnsParameters}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'descending' }]}
        canMeasureWidth={canMeasureWidth}
        ariaRowIndex={1}
      />
    </tr></thead></table>)

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith([])
  })

  it('prepends a new column with ascending order to orderBy when a different header is clicked', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        columnsParameters={columnsParameters}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'ascending' }]}
        canMeasureWidth={canMeasureWidth}
        ariaRowIndex={1}
      />
    </tr></thead></table>)

    const addressHeader = getByText('Address')
    await user.click(addressHeader)

    expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'Address', direction: 'ascending' }, { column: 'Age', direction: 'ascending' }])
  })

  describe('Column Menu Integration', () => {
    it('integrates menu button with table header accessibility', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole } = render(
        <table>
          <thead>
            <tr>
              <TableHeader
                columnsParameters={columnsParameters}
                canMeasureWidth={canMeasureWidth}
                ariaRowIndex={1}
                onOrderByChange={onOrderByChange}
                orderBy={[]}
              />
            </tr>
          </thead>
        </table>
      )

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', {
        name: 'Column menu for Name',
      })

      // Test integration: menu button is properly nested within table header
      expect(nameHeader.contains(menuButton)).toBe(true)

      await user.click(menuButton)
      const menu = getByRole('menu')

      // Test integration: menu is properly labeled by column name
      const labelId = menu.getAttribute('aria-labelledby')
      expect(labelId).toBeTruthy()
      if (!labelId) throw new Error('labelId should be defined')
      const label = document.getElementById(labelId)
      if (!label) throw new Error('label element should exist')
      expect(label.textContent).toBe('Name')
    })

    it('maintains proper focus management within table context', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole, queryByRole } = render(
        <table>
          <thead>
            <tr>
              <TableHeader
                columnsParameters={columnsParameters}
                canMeasureWidth={canMeasureWidth}
                ariaRowIndex={1}
                onOrderByChange={onOrderByChange}
                orderBy={[]}
              />
            </tr>
          </thead>
        </table>
      )

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', {
        name: 'Column menu for Name',
      })

      await user.click(menuButton)
      getByRole('menu')

      // Test integration: menu opens within table and can be closed
      await user.click(menuButton)
      expect(queryByRole('menu')).toBeNull()
    })
  })
})
