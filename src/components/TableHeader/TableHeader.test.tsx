import { within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ColumnsVisibilityContext } from '../../contexts/ColumnsVisibilityContext.js'
import { SortInfoAndActionsByColumnContext } from '../../contexts/OrderByContext.js'
import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { useHTMLElement } from '../../hooks/useHTMLElement.js'
import { render as _render } from '../../utils/userEvent.js'
import TableHeader from './TableHeader.js'

function ContainerProvider({ children }: { children: ReactNode }) {
  const { element, onMount } = useHTMLElement<HTMLDivElement>()
  return (
    <div ref={onMount}>
      <PortalContainerContext.Provider value={element}>
        {children}
      </PortalContainerContext.Provider>
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    const { getByText } = render(
      <table>
        <thead>
          <tr>
            <TableHeader
              columnsParameters={columnsParameters}
              ariaRowIndex={1}
            />
          </tr>
        </thead>
      </table>
    )
    columnsParameters.forEach((descriptor) => {
      getByText(descriptor.name)
    })
  })

  it('calls toggleOrderBy when a header is clicked', async () => {
    const toggleOrderBy = vi.fn()
    const sortInfoAndActionsByColumn = new Map([['Age', { toggleOrderBy }]])
    const { user, getByText } = render(
      <table>
        <thead>
          <tr>
            <SortInfoAndActionsByColumnContext.Provider value={sortInfoAndActionsByColumn}>
              <TableHeader
                columnsParameters={columnsParameters}
                ariaRowIndex={1}
              />
            </SortInfoAndActionsByColumnContext.Provider>
          </tr>
        </thead>
      </table>
    )

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(toggleOrderBy).toHaveBeenCalled()
  })

  describe('Column Menu Integration', () => {
    function getHideColumn() {
      return vi.fn()
    }
    it('integrates menu button with table header accessibility', async () => {
      const { user, getByRole } = render(
        <table>
          <thead>
            <tr>
              {/* pass the visibility context, to get the "Hide column" button */}
              <ColumnsVisibilityContext.Provider value={{ getHideColumn, numberOfVisibleColumns: columnsParameters.length }}>
                <TableHeader
                  columnsParameters={columnsParameters}
                  ariaRowIndex={1}
                />
              </ColumnsVisibilityContext.Provider>
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
      const { user, getByRole, queryByRole } = render(
        <table>
          <thead>
            <tr>
              {/* pass the visibility context, to get the "Hide column" button */}
              <ColumnsVisibilityContext.Provider value={{ getHideColumn, numberOfVisibleColumns: columnsParameters.length }}>
                <TableHeader
                  columnsParameters={columnsParameters}
                  ariaRowIndex={1}
                />
              </ColumnsVisibilityContext.Provider>
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
