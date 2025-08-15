import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ColumnWidthsProvider } from '../../hooks/useColumnWidths.js'
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
  columnConfig: { sortable: true },
}

const nonSortableProps = { ...defaultProps, columnConfig: { sortable: false } }

describe('ColumnHeader', () => {
  const cacheKey = 'key'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders column header correctly', () => {
    const content = 'test'
    const { getByRole } = render(<table><thead><tr><ColumnHeader columnName={content} {...nonSortableProps}>{content}</ColumnHeader></tr></thead></table>)
    const element = getByRole('columnheader')
    expect(element.textContent).toEqual(content)
    expect(getOffsetWidth).not.toHaveBeenCalled()
  })

  it('renders headerComponent from columnConfiguration if present', () => {
    const key = 'test'
    const content = 'component'
    const columnConfig = { headerComponent: <span>{content}</span> }
    const props = { ...defaultProps, columnConfig }
    const { getByRole } = render(<table><thead><tr><ColumnHeader columnName={key} {...props}>{content}</ColumnHeader></tr></thead></table>)
    const element = getByRole('columnheader')
    expect(element.textContent).toEqual(content)
    expect(getOffsetWidth).not.toHaveBeenCalled()
  })

  it('measures the width if canMeasureWidth is true', () => {
    render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} canMeasureWidth={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalled()
  })

  it('measures the width again if canMeasureWidth toggles to true', () => {
    const { rerender } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} canMeasureWidth={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(1)
    // new data is being loaded
    rerender(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} canMeasureWidth={false} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(1)
    // new data is ready
    rerender(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} canMeasureWidth={true} /></tr></thead></table>)
    expect(getOffsetWidth).toHaveBeenCalledTimes(2)
  })

  it('loads column width from localStorage when localStorageKey is provided', () => {
    const savedWidth = 42
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps}/></tr></thead></table>
    </ColumnWidthsProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
  })

  it.for([
    { savedWidth: 5, minWidth: 10, expected: '10px' },
    { savedWidth: 50, minWidth: 10, expected: '50px' },
  ])('clamps loaded column width from localStorage when localStorageKey is provided', ({ savedWidth, minWidth, expected }) => {
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={minWidth}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps}/></tr></thead></table>
    </ColumnWidthsProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(expected)
  })

  it('handles double click on resize handle to auto resize', async () => {
    // Set the initial width
    const savedWidth = 42
    const minWidth = 10
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const { user, getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={minWidth}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnWidthsProvider>)
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

    const { user, getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnWidthsProvider>)

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

  it('respects column-specific minWidth when resizing', async () => {
    const savedWidth = 50
    const columnMinWidth = 30
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const columnConfig = { minWidth: columnMinWidth }
    const props = { ...defaultProps, columnConfig }

    const { user, getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...props} /></tr></thead></table>
    </ColumnWidthsProvider>)

    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')

    // Try to resize to below column minWidth (but above global minWidth)
    const x = 150
    const delta = -30 // This would make width 20, which is below column minWidth of 30
    await user.pointer([
      { keys: '[MouseLeft>]', target: resizeHandle, coords: { x, y: 0 } },
      { coords: { x: x + delta, y: 0 } },
      { keys: '[/MouseLeft]' },
    ])

    // Should be clamped to column minWidth (30), not global minWidth (10)
    expect(header.style.maxWidth).toEqual(`${columnMinWidth}px`)
  })

  it('uses global minWidth when column minWidth is less than global minWidth', async () => {
    const savedWidth = 50
    const globalMinWidth = 30
    const columnMinWidth = 20 // Less than global minWidth
    localStorage.setItem(cacheKey, JSON.stringify([{ width: savedWidth }]))

    const columnConfig = { minWidth: columnMinWidth }
    const props = { ...defaultProps, columnConfig }

    const { user, getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={globalMinWidth}>
      <table><thead><tr><ColumnHeader columnName="test" {...props} /></tr></thead></table>
    </ColumnWidthsProvider>)

    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')

    // Try to resize to below both minWidths
    const x = 150
    const delta = -35 // This would make width 15, which is below both minWidths
    await user.pointer([
      { keys: '[MouseLeft>]', target: resizeHandle, coords: { x, y: 0 } },
      { coords: { x: x + delta, y: 0 } },
      { keys: '[/MouseLeft]' },
    ])

    // Should be clamped to global minWidth (30) since it's larger than column minWidth (20)
    expect(header.style.maxWidth).toEqual(`${columnMinWidth}px`)
  })

  it('reloads column width when localStorageKey changes', () => {
    const cacheKey2 = 'key-2'
    const width1 = 150
    localStorage.setItem(cacheKey, JSON.stringify([{ width: width1 }]))
    const width2 = 300
    localStorage.setItem(cacheKey2, JSON.stringify([{ width: width2 }]))

    const { rerender, getByRole } = render(<ColumnWidthsProvider localStorageKey={cacheKey} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnWidthsProvider>)
    const header = getByRole('columnheader')
    expect(header.style.maxWidth).toEqual(`${width1}px`)
    rerender(<ColumnWidthsProvider localStorageKey={cacheKey2} numColumns={1} minWidth={10}>
      <table><thead><tr><ColumnHeader columnName="test" {...defaultProps} /></tr></thead></table>
    </ColumnWidthsProvider>)
    expect(header.style.maxWidth).toEqual(`${width2}px`)
  })

  it('call toggleOrderBy (eg. to change orderBy) when clicking on the header, but not when clicking on the resize handle', async () => {
    const toggleOrderBy = vi.fn()
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} toggleOrderBy={toggleOrderBy} /></tr></thead></table>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')
    await user.click(resizeHandle)
    expect(toggleOrderBy).not.toHaveBeenCalled()
    await user.click(header)
    expect(toggleOrderBy).toHaveBeenCalled()
  })

  it.for(['{ }', '{Enter}'])('call toggleOrderBy (eg. to change orderBy) when pressing "%s" while the header is focused', async (key) => {
    const toggleOrderBy = vi.fn()
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...defaultProps} toggleOrderBy={toggleOrderBy} /></tr></thead></table>)
    const header = getByRole('columnheader')
    header.focus()
    await user.keyboard(key)
    expect(toggleOrderBy).toHaveBeenCalled()
  })

  it('does not call toggleOrderBy when clicking on the header when sortable is set to false', async () => {
    const toggleOrderBy = vi.fn()
    const props = { ...defaultProps, sortable: false }
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...props} toggleOrderBy={toggleOrderBy} /></tr></thead></table>)
    const header = getByRole('columnheader')
    const resizeHandle = getByRole('spinbutton')
    await user.click(resizeHandle)
    expect(toggleOrderBy).not.toHaveBeenCalled()
    await user.click(header)
    expect(toggleOrderBy).toHaveBeenCalled()
  })

  it.for(['{ }', '{Enter}'])('does not call toggleOrderBy when pressing "%s" while the header is focused', async (key) => {
    const toggleOrderBy = vi.fn()
    const props = { ...defaultProps, sortable: false }
    const { user, getByRole } = render(<table><thead><tr><ColumnHeader columnName="test" {...props} toggleOrderBy={toggleOrderBy} /></tr></thead></table>)
    const header = getByRole('columnheader')
    header.focus()
    await user.keyboard(key)
    expect(toggleOrderBy).toHaveBeenCalled()
  })
})
