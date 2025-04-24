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
    isVisible: true
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when not visible', () => {
    const { container } = render(
      <ColumnMenu {...defaultProps} isVisible={false} />
    )
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
    const { user, getByText } = render(
      <ColumnMenu {...defaultProps} onHideColumn={onHideColumn} />
    )
    
    await user.click(getByText('Hide column'))
    
    expect(onHideColumn).toHaveBeenCalledWith(defaultProps.columnIndex)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows "Show all columns" when hasHiddenColumns is true', () => {
    const { getByText } = render(
      <ColumnMenu {...defaultProps} hasHiddenColumns={true} />
    )
    
    expect(getByText('Show all columns')).toBeDefined()
  })

  it('calls onShowAllColumns when "Show all columns" is clicked', async () => {
    const onShowAllColumns = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu 
        {...defaultProps} 
        hasHiddenColumns={true} 
        onShowAllColumns={onShowAllColumns} 
      />
    )
    
    await user.click(getByText('Show all columns'))
    
    expect(onShowAllColumns).toHaveBeenCalled()
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows sort option when sortable is true', () => {
    const { getByText } = render(
      <ColumnMenu {...defaultProps} sortable={true} />
    )
    
    expect(getByText('Sort ascending')).toBeDefined()
  })

  it('calls onSort when sort option is clicked', async () => {
    const onSort = vi.fn()
    const { user, getByText } = render(
      <ColumnMenu 
        {...defaultProps} 
        sortable={true} 
        onSort={onSort} 
      />
    )
    
    await user.click(getByText('Sort ascending'))
    
    expect(onSort).toHaveBeenCalledWith(defaultProps.columnIndex)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
}) 