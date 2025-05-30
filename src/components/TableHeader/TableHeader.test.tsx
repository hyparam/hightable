import { beforeEach, describe, expect, it, vi } from 'vitest'
import { within } from '@testing-library/react'
import { render } from '../../utils/userEvent.js'
import TableHeader from './TableHeader.js'

describe('TableHeader', () => {
  const header = ['Name', 'Age', 'Address']
  const dataReady = true

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    const { getByText } = render(<table><thead><tr>
      <TableHeader
        dataReady={dataReady}
        header={header}
        ariaRowIndex={1}
      />
    </tr></thead></table>)
    header.forEach(columnHeader => {
      expect(getByText(columnHeader)).toBeDefined()
    })
  })

  it('sets orderBy to the column name (ascending order) when a header is clicked', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        header={header}
        orderBy={[]}
        onOrderByChange={onOrderByChange}
        dataReady={dataReady}
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
        header={header}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'ascending' }]}
        dataReady={dataReady}
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
        header={header}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'descending' }]}
        dataReady={dataReady}
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
        header={header}
        onOrderByChange={onOrderByChange}
        orderBy={[{ column: 'Age', direction: 'ascending' }]}
        dataReady={dataReady}
        ariaRowIndex={1}
      />
    </tr></thead></table>)

    const addressHeader = getByText('Address')
    await user.click(addressHeader)

    expect(onOrderByChange).toHaveBeenCalledWith([{ column: 'Address', direction: 'ascending' }, { column: 'Age', direction: 'ascending' }])
  })

  describe('Column Menu', () => {
    it('toggles column menu when menu button is clicked', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole } = render(<table><thead><tr>
        <TableHeader
          header={header}
          dataReady={dataReady}
          ariaRowIndex={1}
          onOrderByChange={onOrderByChange}
          orderBy={[]}
        />
      </tr></thead></table>)

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', { name: 'Column Menu Button' })
      await user.click(menuButton)

      const menu = getByRole('menu')
      expect(menu).toBeDefined()
      const labelId = menu.getAttribute('aria-labelledby')
      expect(labelId).toBeDefined()
      if (!labelId) throw new Error('labelId should be defined')
      const label = document.getElementById(labelId)
      if (!label) throw new Error('label element should exist')
      expect(label.textContent).toBe('Name')
    })

    it('closes column menu when clicking menu button again', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole, queryByRole } = render(<table><thead><tr>
        <TableHeader
          header={header}
          dataReady={dataReady}
          ariaRowIndex={1}
          onOrderByChange={onOrderByChange}
          orderBy={[]}
        />
      </tr></thead></table>)

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', { name: 'Column Menu Button' })
      await user.click(menuButton)
      expect(getByRole('menu')).toBeDefined()

      await user.click(menuButton)
      expect(queryByRole('menu')).toBeNull()
    })

    it('shows sort options in menu when column is sortable', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole } = render(<table><thead><tr>
        <TableHeader
          header={header}
          dataReady={dataReady}
          ariaRowIndex={1}
          onOrderByChange={onOrderByChange}
          orderBy={[]}
        />
      </tr></thead></table>)

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', { name: 'Column Menu Button' })
      await user.click(menuButton)

      const menu = getByRole('menu')
      const sortButton = within(menu).getByRole('menuitem')
      expect(sortButton).toBeDefined()
      expect(sortButton.textContent).toBe('Sort')
    })

    it('updates sort direction text in menu based on current sort', async () => {
      const onOrderByChange = vi.fn()
      const { user, getByRole, rerender } = render(<table><thead><tr>
        <TableHeader
          header={header}
          dataReady={dataReady}
          ariaRowIndex={1}
          onOrderByChange={onOrderByChange}
          orderBy={[{ column: 'Name', direction: 'ascending' }]}
        />
      </tr></thead></table>)

      const nameHeader = getByRole('columnheader', { name: 'Name' })
      const menuButton = within(nameHeader).getByRole('button', { name: 'Column Menu Button' })
      await user.click(menuButton)

      const menu = getByRole('menu')
      const sortButton = within(menu).getByRole('menuitem')
      expect(sortButton.textContent).toBe('Ascending')

      rerender(<table><thead><tr>
        <TableHeader
          header={header}
          dataReady={dataReady}
          ariaRowIndex={1}
          onOrderByChange={onOrderByChange}
          orderBy={[{ column: 'Name', direction: 'descending' }]}
        />
      </tr></thead></table>)

      expect(sortButton.textContent).toBe('Descending')
    })
  })
})
