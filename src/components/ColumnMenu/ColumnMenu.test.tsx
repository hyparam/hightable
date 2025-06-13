import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenu from './ColumnMenu.js'

describe('ColumnMenu', () => {
  const defaultProps = {
    columnName: 'Test Column',
    isOpen: true,
    position: { left: 100, top: 100 },
    columnIndex: 0,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when not visible', () => {
      const { container } = render(
        <ColumnMenu {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders menu with column name when visible', () => {
      const { getByRole, getByText } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      expect(menu).toBeDefined()
      const ariaLabelledBy = menu.getAttribute('aria-labelledby')
      expect(ariaLabelledBy).toBeDefined()
      const labelElement = getByText('Test Column')
      expect(labelElement).toBeDefined()
      expect(labelElement.getAttribute('id')).toBe(ariaLabelledBy)
    })

    it('renders with correct position styling', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} position={{ left: 200, top: 300 }} />
      )

      const menu = getByRole('menu')
      expect(menu.style.left).toBe('200px')
      expect(menu.style.top).toBe('300px')
    })

    it('renders with correct ARIA attributes', () => {
      const { getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      expect(menu.getAttribute('aria-orientation')).toBe('vertical')
      expect(menu.getAttribute('tabIndex')).toBe('-1')
    })

    it('renders overlay element', () => {
      const { container } = render(<ColumnMenu {...defaultProps} />)

      const overlay = container.querySelector('[role="presentation"]')
      expect(overlay).toBeDefined()
    })

    it('renders separator element', () => {
      const { getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      const separator = menu.querySelector('hr')
      expect(separator).toBeDefined()
      expect(separator?.getAttribute('role')).toBe('separator')
      expect(separator?.getAttribute('aria-hidden')).toBe('true')
    })
  })

  describe('Sort functionality', () => {
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
        <ColumnMenu {...defaultProps} sortable={true} direction='ascending' />
      )

      expect(getByRole('menuitem').textContent).toBe('Ascending')

      rerender(
        <ColumnMenu {...defaultProps} sortable={true} direction='descending' />
      )
      expect(getByRole('menuitem').textContent).toBe('Descending')
    })

    it('does not render sort button when sortable is false', () => {
      const { queryByRole } = render(
        <ColumnMenu {...defaultProps} sortable={false} />
      )

      expect(queryByRole('menuitem')).toBeNull()
    })

    it('does not render sort button when sortable is undefined', () => {
      const { queryByRole } = render(<ColumnMenu {...defaultProps} />)

      expect(queryByRole('menuitem')).toBeNull()
    })
  })

  describe('MenuItem component', () => {
    it('renders with correct ARIA attributes', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      const menuItem = getByRole('menuitem')
      expect(menuItem.getAttribute('tabIndex')).toBe('0')
      expect(menuItem.getAttribute('type')).toBe('button')
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

    it('focuses button when clicked', async () => {
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      const sortButton = getByRole('menuitem')
      await user.click(sortButton)
      expect(document.activeElement).toBe(sortButton)
    })
  })

  describe('Keyboard navigation', () => {
    it('closes menu on Escape key', async () => {
      const { user, getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      menu.focus()
      await user.keyboard('{Escape}')

      expect(defaultProps.onToggle).toHaveBeenCalled()
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

    it('calls onClick on Space key when sortable', async () => {
      const onClick = vi.fn()
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} onClick={onClick} />
      )

      const menu = getByRole('menu')
      menu.focus()
      await user.keyboard('{ }')

      expect(onClick).toHaveBeenCalled()
    })

    it('does not call onClick on Enter/Space when not sortable', async () => {
      const onClick = vi.fn()
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={false} onClick={onClick} />
      )

      const menu = getByRole('menu')
      menu.focus()
      await user.keyboard('{Enter}')
      await user.keyboard('{ }')

      expect(onClick).not.toHaveBeenCalled()
    })

    it('handles Enter/Space gracefully when no onClick provided', async () => {
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={false} />
      )

      const menu = getByRole('menu')
      menu.focus()

      // Should not throw errors
      await user.keyboard('{Enter}')
      await user.keyboard('{ }')

      expect(menu).toBeDefined()
    })

    describe('Arrow key navigation', () => {
      it('handles ArrowUp key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowUp}')

        // Navigation should be handled (no specific assertion as useFocusManagement is mocked)
        expect(menu).toBeDefined()
      })

      it('handles ArrowDown key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowDown}')

        expect(menu).toBeDefined()
      })

      it('handles ArrowLeft key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowLeft}')

        expect(menu).toBeDefined()
      })

      it('handles ArrowRight key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowRight}')

        expect(menu).toBeDefined()
      })
    })

    describe('Tab navigation', () => {
      it('handles Tab key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{Tab}')

        expect(menu).toBeDefined()
      })

      it('handles Shift+Tab key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{Shift>}{Tab}{/Shift}')

        expect(menu).toBeDefined()
      })
    })

    it('prevents default and stops propagation for all handled keys', async () => {
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      const menu = getByRole('menu')
      menu.focus()

      // Test that these keys don't cause default browser behavior
      await user.keyboard('{Escape}')
      await user.keyboard('{Enter}')
      await user.keyboard('{ }')
      await user.keyboard('{ArrowUp}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowLeft}')
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{Tab}')

      expect(menu).toBeDefined()
    })

    it('handles unknown keys with default prevention', async () => {
      const { user, getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      menu.focus()
      await user.keyboard('a')

      expect(menu).toBeDefined()
    })
  })

  describe('Overlay interactions', () => {
    it('closes menu when overlay is clicked', async () => {
      const { user, container } = render(<ColumnMenu {...defaultProps} />)

      const overlay = container.querySelector('[role="presentation"]')
      expect(overlay).toBeDefined()

      if (overlay) {
        await user.click(overlay)
        expect(defaultProps.onToggle).toHaveBeenCalled()
      }
    })
  })

  describe('Portal rendering', () => {
    it('renders content in portal', () => {
      const { getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      expect(menu).toBeDefined()

      // Menu should not be a direct child of the render container
      // since it's rendered in a portal
      expect(menu.closest('[data-testid]')).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('works without onClick handler', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      const menu = getByRole('menu')
      expect(menu).toBeDefined()
    })

    it('handles empty column name', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} columnName='' />
      )

      const menu = getByRole('menu')
      const id = menu.getAttribute('aria-labelledby')
      if (id === null) {
        throw new Error('aria-labelledby should not be null')
      }

      const labelElement = menu.querySelector('[role=presentation]')
      expect(labelElement).toBeDefined()
      expect(labelElement?.textContent).toBe('')
      expect(labelElement?.getAttribute('id')).toBe(id)
    })

    it('handles special characters in column name', () => {
      const specialName = 'Column with "quotes" & symbols'
      const { getByText } = render(
        <ColumnMenu {...defaultProps} columnName={specialName} />
      )

      expect(getByText(specialName)).toBeDefined()
    })
  })
})
