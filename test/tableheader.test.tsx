import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TableHeader, { cellStyle } from '../src/tableheader.js'
import type { State } from '../src/tableheader.js'

// Mock useState
function useState<S>(initialState: S): State<S> {
  const state: State<S> = [initialState, vi.fn((v: S | ((prev: S) => S)) => {
    if (v instanceof Function) state[0] = v(state[0])
    else state[0] = v
  })]
  return state
}

describe('TableHeader', () => {
  const header = ['Name', 'Age', 'Address']
  const dataReady = true

  it('renders table headers correctly', () => {
    const columnWidths = useState<Array<number | undefined>>([100, 200, undefined])
    const { getByTitle } = render(<table>
      <TableHeader header={header} columnWidths={columnWidths} dataReady={dataReady} />
    </table>)
    header.forEach(columnHeader => {
      expect(getByTitle(columnHeader)).toBeDefined()
    })
    expect(columnWidths[0]).toEqual([-20, -20, -20])
    expect(columnWidths[1]).toHaveBeenCalledTimes(1)
  })

  it('handles double click to auto resize', () => {
    const columnWidths = useState<Array<number | undefined>>([100, 200, undefined])
    const { getByTitle } = render(<table>
      <TableHeader header={header} columnWidths={columnWidths} dataReady={dataReady} />
    </table>)

    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    fireEvent.doubleClick(resizeHandle)
    expect(columnWidths[0]).toEqual([-20, -20, -20])
    expect(columnWidths[1]).toHaveBeenCalledTimes(3)
  })

  it('handles mouse click and drag to resize', () => {
    const columnWidths = useState<Array<number | undefined>>([100, 200, undefined])
    const { getByTitle } = render(<table>
      <TableHeader header={header} columnWidths={columnWidths} dataReady={dataReady} />
    </table>)

    const firstHeader = getByTitle(header[0])
    const resizeHandle = firstHeader.querySelector('span')
    if (!resizeHandle) throw new Error('Resize handle not found')

    // Simulate click and drag
    fireEvent.mouseDown(resizeHandle, { clientX: 150 })
    fireEvent.mouseMove(document, { clientX: 160 })
    fireEvent.mouseUp(document)

    expect(columnWidths[0]).toEqual([110, -20, -20])
    expect(columnWidths[1]).toHaveBeenCalledTimes(2)
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
