import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TableHeader, { cellStyle } from '../src/TableHeader.js'

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

  it('renders table headers correctly', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)
    header.forEach(columnHeader => {
      expect(getByTitle(columnHeader)).toBeDefined()
    })
    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(0)
    expect(setColumnWidths).toHaveBeenCalledTimes(1)
  })

  it('handles double click to auto resize', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)

    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.doubleClick(resizeHandle)
    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(2)
    expect(setColumnWidths).toHaveBeenCalledTimes(1)
  })

  it('handles mouse click and drag to resize', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        dataReady={dataReady} />
    </table>)

    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    // Simulate click and drag
    fireEvent.mouseDown(resizeHandle, { clientX: 150 })
    fireEvent.mouseMove(document, { clientX: 160 })
    fireEvent.mouseUp(document)

    expect(columnWidths).toEqual([100, 200, undefined])
    expect(setColumnWidth).toHaveBeenCalledTimes(1)
    expect(setColumnWidths).toHaveBeenCalledTimes(1)
  })

  it('sets orderBy to the column name when a header is clicked', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const setOrderBy = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        setOrderBy={setOrderBy}
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByTitle('Age')
    fireEvent.click(ageHeader)

    expect(setOrderBy).toHaveBeenCalledWith('Age')
  })

  it('toggles orderBy to undefined when the same header is clicked again', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const setOrderBy = vi.fn()
    const { getByTitle, rerender } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        setOrderBy={setOrderBy}
        orderBy="Age"
        dataReady={dataReady} />
    </table>)

    const ageHeader = getByTitle('Age')
    fireEvent.click(ageHeader)

    expect(setOrderBy).toHaveBeenCalledWith(undefined)
  })

  it('changes orderBy to a new column when a different header is clicked', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const setOrderBy = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        setOrderBy={setOrderBy}
        orderBy="Age"
        dataReady={dataReady} />
    </table>)

    const addressHeader = getByTitle('Address')
    fireEvent.click(addressHeader)

    expect(setOrderBy).toHaveBeenCalledWith('Address')
  })

  it('does not change orderBy when clicking on the resize handle', () => {
    const { columnWidths, setColumnWidth, setColumnWidths } = mockColumnWidths()
    const setOrderBy = vi.fn()
    const { getByTitle } = render(<table>
      <TableHeader
        header={header}
        columnWidths={columnWidths}
        setColumnWidth={setColumnWidth}
        setColumnWidths={setColumnWidths}
        setOrderBy={setOrderBy}
        dataReady={dataReady} />
    </table>)

    const nameHeader = getByTitle('Name')
    const resizeHandle = nameHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.click(resizeHandle)

    expect(setOrderBy).not.toHaveBeenCalled()
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
