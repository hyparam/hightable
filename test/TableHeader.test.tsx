import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableHeader, { ColumnWidth, cellStyle, saveColumnWidth } from '../src/TableHeader.js'
import { render } from './userEvent.js'

vi.stubGlobal('localStorage', (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    clear: () => { store = {} },
  }
})())

// Mock columnWidths state
function mockColumnWidths() {
  const obj = {
    columnWidths: [100, 200, undefined],
    setColumnWidth: vi.fn((columnIndex: number, columnWidth: number | undefined) => {
      obj.columnWidths[columnIndex] = columnWidth
    }),
    setColumnWidths: vi.fn((columnWidths: Array<number | undefined>) => {
      obj.columnWidths = columnWidths
    }),
  }
  return obj
}

describe('TableHeader', () => {
  const header = ['Name', 'Age', 'Address']
  const dataReady = true
  const cacheKey = 'test-table'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders table headers correctly', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByText } = render(<table>
      <TableHeader
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)
    header.forEach(columnHeader => {
      expect(getByText(columnHeader)).toBeDefined()
    })
    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(0)
    expect(setColumnWidths).toHaveBeenCalledTimes(2)
    expect(localStorage.getItem).not.toHaveBeenCalled()
    expect(localStorage.setItem).not.toHaveBeenCalled()
  })

  it('loads column widths from localStorage when cacheKey is provided', () => {
    const savedWidths: ColumnWidth[] = [
      { columnIndex: 0, columnName: 'Name', width: 150 },
      { columnIndex: 1, columnName: 'Age', width: 250 },
    ]
    vi.mocked(localStorage.getItem).mockReturnValueOnce(JSON.stringify(savedWidths))

    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    render(<table>
      <TableHeader
        header={header}
        cacheKey={cacheKey}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)

    expect(localStorage.getItem).toHaveBeenCalledWith(`column-widths:${cacheKey}`)
    expect(setColumnWidths).toHaveBeenCalledWith([150, 250, undefined])
  })

  it('handles double click to auto resize', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { user, getByText } = render(<table>
      <TableHeader
        cacheKey={cacheKey}
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)

    const firstHeader = getByText(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    await user.dblClick(resizeHandle)
    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(2)
    expect(setColumnWidths).toHaveBeenCalledTimes(2)
  })

  it('handles mouse click and drag to resize', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { user, getByText } = render(<table>
      <TableHeader
        cacheKey={cacheKey}
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)

    // Simulate resizing the first column
    const firstHeader = getByText(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    await user.pointer([
      // press the left button on the resize handle, at x=150
      { keys: '[MouseLeft>]', target: resizeHandle, coords: { x: 150, y: 0 } },
      // move the pointer to x=160
      { coords: { x: 160, y: 0 } },
      // release the left button
      { keys: '[/MouseLeft]' },
    ])

    expect(setColumnWidth).toHaveBeenCalledWith(0, 110)

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        `column-widths:${cacheKey}`,
        JSON.stringify([{ columnIndex: 0, columnName: 'Name', width: 100 }])
      )
    })
  })

  it('sets orderBy to the column name when a header is clicked', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({ column: 'Age' })
  })

  it('toggles orderBy to undefined when the same header is clicked again', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        orderBy={{ column: 'Age' }}
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByText('Age')
    await user.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({})
  })

  it('changes orderBy to a new column when a different header is clicked', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        orderBy={{ column: 'Age' }}
        dataReady={dataReady} />
    </table>)

    const addressHeader = getByText('Address')
    await user.click(addressHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({ column: 'Address' })
  })

  it('does not change orderBy when clicking on the resize handle', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { user, getByText } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        dataReady={dataReady} />
    </table>)

    const nameHeader = getByText('Name')
    const resizeHandle = nameHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    await user.click(resizeHandle)

    expect(onOrderByChange).not.toHaveBeenCalled()
  })

  it('reloads column widths when cacheKey changes', () => {
    const setColumnWidths = vi.fn()

    const cacheKey2 = 'test-table-2'
    saveColumnWidth(cacheKey, { columnIndex: 0, columnName: 'Name', width: 150 })
    saveColumnWidth(cacheKey, { columnIndex: 1, columnName: 'Age', width: 200 })
    saveColumnWidth(cacheKey2, { columnIndex: 0, columnName: 'Name', width: 300 })
    saveColumnWidth(cacheKey2, { columnIndex: 1, columnName: 'Age', width: 250 })

    const { rerender } = render(<table>
      <TableHeader
        header={header}
        cacheKey={cacheKey}
        columnWidths={[100, 200, undefined]}
        setColumnWidth={vi.fn()}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)

    expect(localStorage.getItem).toHaveBeenCalledWith(`column-widths:${cacheKey}`)
    expect(setColumnWidths).toHaveBeenCalledWith([150, 200, undefined])

    rerender(<table>
      <TableHeader
        header={header}
        cacheKey={cacheKey2}
        columnWidths={[]}
        setColumnWidth={vi.fn()}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)

    expect(localStorage.getItem).toHaveBeenCalledWith(`column-widths:${cacheKey2}`)
    expect(setColumnWidths).toHaveBeenCalledWith([300, 250, undefined])
  })
})

describe('cellStyle', () => {
  it('returns correct style for defined width', () => {
    const style = cellStyle(100)
    expect(style).toEqual({ minWidth: '100px', maxWidth: '100px' })
  })

  it('returns correct style for undefined width', () => {
    const style = cellStyle(undefined)
    expect(style).toEqual({ minWidth: undefined, maxWidth: undefined })
  })
})
