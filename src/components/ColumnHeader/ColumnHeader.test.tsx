import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ColumnWidthProvider } from '../../hooks/useColumnWidth.js'
import { render } from '../../utils/userEvent.js'
import ColumnHeader from './ColumnHeader.js'

import { measureWidth } from '../../helpers/width.js'
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

describe('ColumnHeader', () => {
  const cacheKey = 'key'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders column header correctly', () => {
    const content = 'test'
    const { getByRole } = render(<table><thead><tr><ColumnHeader columnIndex={0}>{content}</ColumnHeader></tr></thead></table>)
    const element = getByRole('columnheader')
    expect(element.textContent).toEqual(content)
    expect(measureWidth).not.toHaveBeenCalled()
  })

  it('measures the width if dataReady is true', () => {
    render(<table><thead><tr><ColumnHeader columnIndex={0} dataReady={true} /></tr></thead></table>)
    expect(measureWidth).toHaveBeenCalled()
  })

  it('measures the width again if dataReady toggles to true', () => {
    const { rerender } = render(<table><thead><tr><ColumnHeader columnIndex={0} dataReady={true} /></tr></thead></table>)
    expect(measureWidth).toHaveBeenCalledTimes(1)
    // new data is being loaded
    rerender(<table><thead><tr><ColumnHeader columnIndex={0} dataReady={false} /></tr></thead></table>)
    expect(measureWidth).toHaveBeenCalledTimes(1)
    // new data is ready
    rerender(<table><thead><tr><ColumnHeader columnIndex={0} dataReady={true} /></tr></thead></table>)
    expect(measureWidth).toHaveBeenCalledTimes(2)
  })

  it('loads column width from localStorage when localStorageKey is provided', () => {
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([savedWidth]))

    const { getByRole } = render(<ColumnWidthProvider localStorageKey={cacheKey}>
      <table><thead><tr><ColumnHeader columnIndex={0}/></tr></thead></table>
    </ColumnWidthProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
  })

  it('handles double click to auto resize', async () => {
    // Set the initial width
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([savedWidth]))

    const { user, getByRole } = render(<ColumnWidthProvider localStorageKey={cacheKey}>
      <table><thead><tr><ColumnHeader columnIndex={0} /></tr></thead></table>
    </ColumnWidthProvider>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('separator')

    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
    expect(measureWidth).toHaveBeenCalledTimes(0)
    await user.dblClick(resizeHandle)
    // the width is set to undefined, and should then be measured, but the measurement can only run in a browser, so it remains undefined here
    expect(header.style.maxWidth).toEqual('')
    expect(measureWidth).toHaveBeenCalledTimes(1)
  })

  it('handles mouse click and drag to resize', async () => {
    // Set the initial width
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([savedWidth]))

    const { user, getByRole } = render(<ColumnWidthProvider localStorageKey={cacheKey}>
      <table><thead><tr><ColumnHeader columnIndex={0} /></tr></thead></table>
    </ColumnWidthProvider>)

    // Simulate resizing the column
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('separator')

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
    localStorage.setItem(cacheKey, JSON.stringify([width1]))
    const width2 = 300
    localStorage.setItem(cacheKey2, JSON.stringify([width2]))

    const { rerender, getByRole } = render(<ColumnWidthProvider localStorageKey={cacheKey}>
      <table><thead><tr><ColumnHeader columnIndex={0} /></tr></thead></table>
    </ColumnWidthProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${width1}px`)
    rerender(<ColumnWidthProvider localStorageKey={cacheKey2}>
      <table><thead><tr><ColumnHeader columnIndex={0} /></tr></thead></table>
    </ColumnWidthProvider>)
    expect(header.style.maxWidth).toEqual(`${width2}px`)
  })

  it('call onClick (eg. to change orderBy) when clicking on the header, but not when clicking on the resize handle', async () => {
    const onClick = vi.fn()
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnIndex={0} onClick={onClick} /></tr></thead></table>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('separator')
    await user.click(resizeHandle)
    expect(onClick).not.toHaveBeenCalled()
    await user.click(header)
    expect(onClick).toHaveBeenCalled()
  })
})
