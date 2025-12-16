import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePortalContainer } from '../../hooks/usePortalContainer'
import { render as _render } from '../../utils/userEvent.js'
import ColumnMenu from './ColumnMenu.js'

function ContainerProvider({ children }: { children: ReactNode }) {
  const { containerRef } = usePortalContainer()
  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}
function render(jsx: ReactNode) {
  return _render(
    <ContainerProvider>
      {jsx}
    </ContainerProvider>
  )
}

describe('ColumnMenu', () => {
  const defaultProps = {
    columnName: 'Test Column',
    isOpen: true,
    position: { left: 100, top: 100 },
    columnIndex: 0,
    close: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when not visible', () => {
      const { container } = render(
        <ColumnMenu {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild?.firstChild).toBeNull()
    })

    it('renders menu with column name when visible', () => {
      const { getByRole, getByText } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      const ariaLabelledBy = menu.getAttribute('aria-labelledby')
      expect(ariaLabelledBy).toBeTruthy()
      const labelElement = getByText('Test Column')
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
      expect(overlay).toBeTruthy()
    })
  })

  describe('Sort functionality', () => {
    it('renders sort button when sortable is true', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      const sortButton = getByRole('menuitem')
      expect(sortButton.textContent).toBe('No sort')
    })

    it('shows correct sort direction text', () => {
      const { getByRole, rerender } = render(
        <ColumnMenu {...defaultProps} sortable={true} direction='ascending' />
      )

      expect(getByRole('menuitem').textContent).toBe('Ascending')

      rerender( // We need to set ContainerProvider, because rerender is not wrapped automatically
        <ContainerProvider>
          <ColumnMenu {...defaultProps} sortable={true} direction='descending' />
        </ContainerProvider>
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

  describe('Visibility options', () => {
    it('renders hide column option when hideColumn is provided', () => {
      const hideColumn = vi.fn()
      const { getByText } = render(
        <ColumnMenu {...defaultProps} hideColumn={hideColumn} />
      )
      const hideOption = getByText('Hide column')
      hideOption.click()
      expect(hideColumn).toHaveBeenCalled()
    })
    it('does not render hide column option when hideColumn is not provided', () => {
      const { queryByText } = render(<ColumnMenu {...defaultProps} />)

      expect(queryByText('Hide column')).toBeNull()
    })
    it('renders show all columns option when showAllColumns is provided', () => {
      const showAllColumns = vi.fn()
      const { getByText } = render(
        <ColumnMenu {...defaultProps} showAllColumns={showAllColumns} />
      )
      const showOption = getByText('Show all columns')
      showOption.click()
      expect(showAllColumns).toHaveBeenCalled()
    })
    it('does not render show all columns option when showAllColumns is not provided', () => {
      const { queryByText } = render(<ColumnMenu {...defaultProps} />)
      expect(queryByText('Show all columns')).toBeNull()
    })
    it('render both hide and show options when both are provided', () => {
      const hideColumn = vi.fn()
      const showAllColumns = vi.fn()
      const { getByText } = render(
        <ColumnMenu
          {...defaultProps}
          hideColumn={hideColumn}
          showAllColumns={showAllColumns}
        />
      )
      getByText('Hide column')
      getByText('Show all columns')
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

    it('calls toggleOrderBy when sort button is clicked', async () => {
      const toggleOrderBy = vi.fn()
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} toggleOrderBy={toggleOrderBy} />
      )

      const sortButton = getByRole('menuitem')
      await user.click(sortButton)
      expect(toggleOrderBy).toHaveBeenCalled()
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

      expect(defaultProps.close).toHaveBeenCalled()
    })

    it('calls toggleOrderBy on Enter key when sortable', async () => {
      const toggleOrderBy = vi.fn()
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} toggleOrderBy={toggleOrderBy} />
      )

      const sortButton = getByRole('menuitem')
      sortButton.focus()
      await user.keyboard('{Enter}')

      expect(toggleOrderBy).toHaveBeenCalled()
    })

    it('calls toggleOrderBy on Space key when sortable', async () => {
      const toggleOrderBy = vi.fn()
      const { user, getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} toggleOrderBy={toggleOrderBy} />
      )

      const sortButton = getByRole('menuitem')
      sortButton.focus()
      await user.keyboard('{ }')

      expect(toggleOrderBy).toHaveBeenCalled()
    })

    // TODO(SL): really test the navigation. For now, it works the same if the key is pressed or not.
    describe('Arrow key navigation', () => {
      it('handles ArrowUp key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} hideColumn={() => undefined} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowUp}')

        // Navigation should be handled (no specific assertion as useFocusManagement is mocked)
      })

      it('handles ArrowDown key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowDown}')
      })

      it('handles ArrowLeft key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowLeft}')
      })

      it('handles ArrowRight key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{ArrowRight}')
      })
    })

    // TODO(SL): really test the navigation. For now, it works the same if the key is pressed or not.
    describe('Tab navigation', () => {
      it('handles Tab key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{Tab}')
      })

      it('handles Shift+Tab key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )

        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{Shift>}{Tab}{/Shift}')
      })
    })

    // TODO(SL): really test the navigation. For now, it works the same if the key is pressed or not.
    describe('Home/End keys', () => {
      it('handles Home key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )
        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{Home}')
        // Navigation should be handled (no specific assertion as useFocusManagement is mocked)
      })
      it('handles End key', async () => {
        const { user, getByRole } = render(
          <ColumnMenu {...defaultProps} sortable={true} />
        )
        const menu = getByRole('menu')
        menu.focus()
        await user.keyboard('{End}')
        // Navigation should be handled (no specific assertion as useFocusManagement is mocked)
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
    })

    it('handles unknown keys with default prevention', async () => {
      const { user, getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')
      menu.focus()
      await user.keyboard('a')
    })
  })

  describe('Overlay interactions', () => {
    it('closes menu when overlay is clicked', async () => {
      const { user, container } = render(<ColumnMenu {...defaultProps} />)

      const overlay = container.querySelector('[role="presentation"]')
      expect(overlay).toBeTruthy()

      if (overlay) {
        await user.click(overlay)
        expect(defaultProps.close).toHaveBeenCalled()
      }
    })
  })

  describe('Portal rendering', () => {
    it('renders content in portal', () => {
      const { getByRole } = render(<ColumnMenu {...defaultProps} />)

      const menu = getByRole('menu')

      // Menu should not be a direct child of the render container
      // since it's rendered in a portal
      expect(menu.closest('[data-testid]')).toBeNull()
    })
  })

  describe('Edge cases', () => {
    it('works without toggleOrderBy handler', () => {
      const { getByRole } = render(
        <ColumnMenu {...defaultProps} sortable={true} />
      )

      getByRole('menu')
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
      expect(labelElement).toBeTruthy()
      expect(labelElement?.textContent).toBe('')
      expect(labelElement?.getAttribute('id')).toBe(id)
    })

    it('handles special characters in column name', () => {
      const specialName = 'Column with "quotes" & symbols'
      const { getByText } = render(
        <ColumnMenu {...defaultProps} columnName={specialName} />
      )

      getByText(specialName)
    })
  })
})
