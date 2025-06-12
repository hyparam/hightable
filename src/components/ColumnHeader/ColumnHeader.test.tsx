import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ColumnStatesProvider } from '../../hooks/useColumnStates.js'
import { render } from '../../utils/userEvent.js'
import ColumnHeader from './ColumnHeader.js'

import { getOffsetWidth } from '../../helpers/width.js'
vi.mock('../../helpers/width.js', { spy: true })

vi.stubGlobal('localStorage', (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => { store.delete(key) },
    setItem: (key: string, value: string) => { store.set(key, value) },
    clear: () => { store.clear() },
    get length() { return store.size },
  }
})())

// delete the local storage before each test
beforeEach(() => {
  localStorage.clear()
})

const defaultProps = {
  columnIndex: 0,
  ariaColIndex: 1,
  ariaRowIndex: 1,
  isColumnMenuOpen: false,
  onToggleColumnMenu: vi.fn(),
}

describe('ColumnHeader', () => {
  const cacheKey = 'key'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders column header correctly', () => {
    const content = 'test'
    const { getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps}>{content}</ColumnHeader></tr></thead></table>)
    const element = getByRole('columnheader')
    expect(element.textContent).toEqual(content)
    expect(getOffsetWidth).not.toHaveBeenCalled()
  })

  it('measures the width if dataReady is true', () => {
    render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} dataReady={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalled()
  })

  it('measures the width again if dataReady toggles to true', () => {
    const { rerender } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} dataReady={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(1)
    // new data is being loaded
    rerender(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} dataReady={false} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(1)
    // new data is ready
    rerender(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} dataReady={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(2)
  })

  it('loads column width from localStorage when localStorageKey is provided', () => {
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { getByRole } = render(<ColumnStatesProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps}/></tr></thead></table>
    </ColumnStatesProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
  })

  it.for([
    { savedWidth: 5, minWidth: 10, expected: '10px' },
    { savedWidth: 50, minWidth: 10, expected: '50px' },
  ])('clamps loaded column width from localStorage when localStorageKey is provided', ({ savedWidth, minWidth, expected }) => {
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { getByRole } = render(<ColumnStatesProvider localStorageKey={cacheKey} numColumns={1} minWidth={minWidth}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps}/></tr></thead></table>
    </ColumnStatesProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(expected)
  })

  it('handles double click on resize handle to auto resize', async () => {
    // Set the initial width
    const savedWidth = 42
    const minWidth = 10
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { user, getByRole } = render(<ColumnStatesProvider localStorageKey={cacheKey} numColumns={1} minWidth={minWidth}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnStatesProvider>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')

    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
    expect(getOffsetWidth).toHaveBeenCalledTimes(0)
    await user.dblClick(resizeHandle)
    // the width is set to undefined, and should then be measured,
    // but the measurement (.offsetWidth) can only run in a browser,
    // so its value is 0
    // The fixed width is then adjusted to the minimum width: 10px
    expect(header.style.maxWidth).toEqual('10px')
    expect(getOffsetWidth).toHaveBeenCalledTimes(1)
  })

  it('handles mouse click and drag on resize handle to resize', async () => {
    // Set the initial width
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { user, getByRole } = render(<ColumnStatesProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnStatesProvider>)

    // Simulate resizing the column
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')

    const x = 150
    const delta = 10
    await user.pointer([
      // press the left button on the resize handle, at x=150
      { keys: '[MouseLeft>]', target: resizeHandle, coords: { x, y: 0 } },
      // move the pointer to x=160
      { coords: { x: x + delta, y: 0 } },
      // release the left button
      { keys: '[/MouseLeft]' },
    ])

    expect(header.style.maxWidth).toEqual(`${savedWidth + delta}px`)
  })

  it('reloads column width when localStorageKey changes', () => {
    const cacheKey2 = 'key-2'
    const width1 = 150
    localStorage.setItem(cacheKey, JSON.stringify([{ width: width1 }]))
    const width2 = 300
    localStorage.setItem(cacheKey2, JSON.stringify([{ width: width2 }]))

    const { rerender, getByRole } = render(<ColumnStatesProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnStatesProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${width1}px`)
    rerender(<ColumnStatesProvider localStorageKey={cacheKey2} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnStatesProvider>)
    expect(header.style.maxWidth).toEqual(`${width2}px`)
  })

  it('call onClick (eg. to change orderBy) when clicking on the header, but not when clicking on the resize handle', async () => {
    const onClick = vi.fn()
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} onClick={onClick} /></tr></thead></table>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')
    await user.click(resizeHandle)
    expect(onClick).not.toHaveBeenCalled()
    await user.click(header)
    expect(onClick).toHaveBeenCalled()
  })

  it.for(['{ }', '{Enter}'])('call onClick (eg. to change orderBy) when pressing "%s" while the header is focused', async (key) => {
    const onClick = vi.fn()
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} onClick={onClick} /></tr></thead></table>)
    const header = getByRole('columnheader')
    header.focus()
    await user.keyboard(key)
    expect(onClick).toHaveBeenCalled()
  })
})
