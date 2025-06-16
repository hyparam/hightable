import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import TableHeader from './TableHeader.js'

describe('TableHeader', () => {
  const columnDescriptors = [{ key: 'Name', index: 0, sortable: true }, { key: 'Age', index: 1, sortable: true }, { key: 'Address', index: 2, sortable: true }]
  const dataReady = true

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    const { getByText } = render(<table><thead><tr>
      <TableHeader
        dataReady={dataReady}
        columnDescriptors={columnDescriptors}
        ariaRowIndex={1}
      />
    </tr></thead></table>)
    columnDescriptors.forEach(descriptor => {
      expect(getByText(descriptor.key)).toBeDefined()
    })
  })

  it('sets orderBy to the column name (ascending order) when a header is clicked', async () => {
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table><thead><tr>
      <TableHeader
        columnDescriptors={columnDescriptors}
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
        columnDescriptors={columnDescriptors}
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
        columnDescriptors={columnDescriptors}
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
        columnDescriptors={columnDescriptors}
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

})
