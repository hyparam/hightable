import { beforeEach, describe, expect, it, vi } from 'vitest'
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

})
