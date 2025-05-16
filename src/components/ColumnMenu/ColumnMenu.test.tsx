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
    columnName: 'Test Column',
    position: { x: 100, y: 100 },
    onClose: vi.fn(),
    isVisible: true,
    onHideColumn: vi.fn(),
    onSort: vi.fn(),
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
    const { user, getByText } = render(<ColumnMenu {...defaultProps} />)

    await user.click(getByText('Hide column'))

    expect(defaultProps.onHideColumn).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('does not render hide column option when onHideColumn is not provided', () => {
    const { queryByText } = render(<ColumnMenu {...defaultProps} onHideColumn={undefined} />)
    expect(queryByText('Hide column')).toBeNull()
  })

  it('disables hide column button when isHideDisabled is true', () => {
    const onHideColumn = vi.fn()
    const { getByText } = render(
      <ColumnMenu {...defaultProps} onHideColumn={onHideColumn} isHideDisabled={true} />
    )

    const hideColumnItem = getByText('Hide column').closest('[role="menuitem"]')
    expect(hideColumnItem).not.toBeNull()
    const element = hideColumnItem as HTMLElement
    expect(element.getAttribute('aria-disabled')).toBe('true')
    expect(element.style.opacity).toBe('0.5')
    expect(element.style.cursor).toBe('not-allowed')
  })

  it('shows "Show all columns" when onShowAllColumns is provided', () => {
    const onShowAllColumns = vi.fn()
    const { getByText } = render(<ColumnMenu {...defaultProps} onShowAllColumns={onShowAllColumns} />)

    expect(getByText('Show all columns')).toBeDefined()
  })

  it('calls onShowAllColumns when "Show all columns" is clicked', async () => {
    const onShowAllColumns = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} onShowAllColumns={onShowAllColumns} />
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

  it('calls onSortAscending when "Sort ascending" is clicked', async () => {
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} />
    )

    await user.click(getByText('Sort ascending'))

    expect(defaultProps.onSort).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onSortDescending when "Sort descending" is clicked', async () => {
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} />
    )

    await user.click(getByText('Sort descending'))

    expect(defaultProps.onSort).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls onClearSort when "Clear sort" is clicked', async () => {
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="ascending" />
    )

    await user.click(getByText('Clear sort'))

    expect(defaultProps.onSort).toHaveBeenCalled()
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
