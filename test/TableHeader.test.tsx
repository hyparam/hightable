import { fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableHeader, { ColumnWidth, cellStyle, saveColumnWidth } from '../src/TableHeader.js'

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
    const { getByTitle } = render(<table>
      <TableHeader
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)
    header.forEach(columnHeader => {
      expect(getByTitle(columnHeader)).toBeDefined()
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

  it('handles double click to auto resize', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByTitle } = render(<table>
      <TableHeader
        cacheKey={cacheKey}
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)

    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.doubleClick(resizeHandle)
    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(2)
    expect(setColumnWidths).toHaveBeenCalledTimes(2)
  })

  it('handles mouse click and drag to resize', async () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByTitle } = render(<table>
      <TableHeader
        cacheKey={cacheKey}
        columnWidths={columnWidths}
        dataReady={dataReady}
        header={header}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths} />
    </table>)

    // Simulate resizing the first column
    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.mouseDown(resizeHandle, { clientX: 150 })
    fireEvent.mouseMove(window, { clientX: 160 })
    fireEvent.mouseUp(window)

    expect(setColumnWidth).toHaveBeenCalledWith(0, 110)

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        `column-widths:${cacheKey}`,
        JSON.stringify([{ columnIndex: 0, columnName: 'Name', width: 100 }])
      )
    })
  })

  it('sets orderBy to the column name when a header is clicked', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByTitle('Age')
    fireEvent.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({ column: 'Age' })
  })

  it('toggles orderBy to undefined when the same header is clicked again', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        orderBy={{ column: 'Age' }}
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByTitle('Age')
    fireEvent.click(ageHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({})
  })

  it('changes orderBy to a new column when a different header is clicked', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        orderBy={{ column: 'Age' }}
        dataReady={dataReady} />
    </table>)

    const addressHeader = getByTitle('Address')
    fireEvent.click(addressHeader)

    expect(onOrderByChange).toHaveBeenCalledWith({ column: 'Address' })
  })

  it('does not change orderBy when clicking on the resize handle', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const onOrderByChange = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        onOrderByChange={onOrderByChange}
        dataReady={dataReady} />
    </table>)

    const nameHeader = getByTitle('Name')
    const resizeHandle = nameHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.click(resizeHandle)

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
