import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenu from './ColumnMenu.js'

describe('ColumnMenu', () => {
  const defaultProps = {
    columnName: 'Test Column',
    isVisible: true,
    position: { left: 100, top: 100 },
    columnIndex: 0,
    onToggleColumnMenu: vi.fn(),
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

  it('renders menu with column name when visible', () => {
    const { getByRole, getByText } = render(
      <ColumnMenu {...defaultProps} />
    )

    const menu = getByRole('menu')
    expect(menu).toBeDefined()
    expect(menu.getAttribute('aria-label')).toBe('Test Column column menu')
    expect(getByText('Test Column')).toBeDefined()
  })

  it('renders sort button when sortable is true', () => {
    const { getByRole } = render(
      <ColumnMenu {...defaultProps} sortable={true} />
    )

    const sortButton = getByRole('menuitem')
    expect(sortButton).toBeDefined()
    expect(sortButton.textContent).toBe('Sort')
  })

  it('shows correct sort direction text', () => {
    const { getByRole, rerender } = render(
      <ColumnMenu {...defaultProps} sortable={true} direction="ascending" />
    )

    expect(getByRole('menuitem').textContent).toBe('Ascending')

    rerender(
      <ColumnMenu {...defaultProps} sortable={true} direction="descending" />
    )
    expect(getByRole('menuitem').textContent).toBe('Descending')
  })

  it('calls onClick when sort button is clicked', async () => {
    const onClick = vi.fn()
    const { user, getByRole } = render(
      <ColumnMenu {...defaultProps} sortable={true} onClick={onClick} />
    )

    const sortButton = getByRole('menuitem')
    await user.click(sortButton)
    expect(onClick).toHaveBeenCalled()
  })

  it('closes menu and focuses button on Escape key', async () => {
    const buttonRef = { current: document.createElement('div') }
    const { user, getByRole } = render(
      <ColumnMenu {...defaultProps} buttonRef={buttonRef} />
    )

    const menu = getByRole('menu')
    menu.focus()
    await user.keyboard('{Escape}')

    expect(defaultProps.onToggleColumnMenu).toHaveBeenCalledWith(defaultProps.columnIndex)
  })

  it('calls onClick on Enter key when sortable', async () => {
    const onClick = vi.fn()
    const { user, getByRole } = render(
      <ColumnMenu {...defaultProps} sortable={true} onClick={onClick} />
    )

    const menu = getByRole('menu')
    menu.focus()
    await user.keyboard('{Enter}')

    expect(onClick).toHaveBeenCalled()
  })
})
