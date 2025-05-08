import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenu from './ColumnMenu.js'

// Mock createPortal to make testing easier
vi.mock('react-dom', () => {
  return {
    createPortal: (node: React.ReactNode) => node,
  }
})

describe('ColumnMenu', () => {
  const defaultProps = {
    column: 'Test Column',
    columnIndex: 0,
    position: { x: 100, y: 100 },
    onClose: vi.fn(),
    isVisible: true,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when not visible', () => {
    const { container } = render(<ColumnMenu {...defaultProps} isVisible={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the column menu with header when visible', () => {
    const { getByText } = render(<ColumnMenu {...defaultProps} />)

    // Verify header
    expect(getByText('Test Column')).toBeDefined()

    // Verify menu items
    expect(getByText('Hide column')).toBeDefined()
  })

  it('calls onHideColumn when hide column is clicked', async () => {
    const onHideColumn = vi.fn()
    const { user, getByText } = render(<ColumnMenu {...defaultProps} onHideColumn={onHideColumn} />)

    await user.click(getByText('Hide column'))

    expect(onHideColumn).toHaveBeenCalledWith(defaultProps.columnIndex)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows "Show all columns" when hasHiddenColumns is true', () => {
    const { getByText } = render(<ColumnMenu {...defaultProps} hasHiddenColumns={true} />)

    expect(getByText('Show all columns')).toBeDefined()
  })

  it('calls onShowAllColumns when "Show all columns" is clicked', async () => {
    const onShowAllColumns = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} hasHiddenColumns={true} onShowAllColumns={onShowAllColumns} />
    )

    await user.click(getByText('Show all columns'))

    expect(onShowAllColumns).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows sorting options when sortable is true', () => {
    const { getByText, getAllByRole } = render(<ColumnMenu {...defaultProps} sortable={true} />)

    expect(getByText('Sort ascending')).toBeDefined()
    expect(getByText('Sort descending')).toBeDefined()
    // Verify the dividers are present (header divider + sort section divider)
    expect(getAllByRole('separator').length).toBe(2)
    // Clear sort should not be visible when no direction is set
    expect(() => getByText('Clear sort')).toThrow()
  })

  it('shows "Clear sort" when a direction is set', () => {
    const { getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="ascending" />
    )

    expect(getByText('Clear sort')).toBeDefined()
  })

  it('calls onSort with ascending direction when "Sort ascending" is clicked', async () => {
    const onSort = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} onSort={onSort} />
    )

    await user.click(getByText('Sort ascending'))

    expect(onSort).toHaveBeenCalledWith(defaultProps.columnIndex, 'ascending')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onSort with descending direction when "Sort descending" is clicked', async () => {
    const onSort = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} onSort={onSort} />
    )

    await user.click(getByText('Sort descending'))

    expect(onSort).toHaveBeenCalledWith(defaultProps.columnIndex, 'descending')
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onSort with null when "Clear sort" is clicked', async () => {
    const onSort = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="ascending" onSort={onSort} />
    )

    await user.click(getByText('Clear sort'))

    expect(onSort).toHaveBeenCalledWith(defaultProps.columnIndex, null)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('applies aria-checked to the ascending option when direction is ascending', () => {
    const { getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="ascending" />
    )

    const ascendingItem = getByText('Sort ascending').closest('[role="menuitem"]')
    const descendingItem = getByText('Sort descending').closest('[role="menuitem"]')

    expect(ascendingItem?.getAttribute('aria-checked')).toBe('true')
    expect(descendingItem?.getAttribute('aria-checked')).toBe('false')
  })

  it('applies aria-checked to the descending option when direction is descending', () => {
    const { getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="descending" />
    )

    const ascendingItem = getByText('Sort ascending').closest('[role="menuitem"]')
    const descendingItem = getByText('Sort descending').closest('[role="menuitem"]')

    expect(descendingItem?.getAttribute('aria-checked')).toBe('true')
    expect(ascendingItem?.getAttribute('aria-checked')).toBe('false')
  })
})
