import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenuButton from './ColumnMenuButton.js'

describe('ColumnMenuButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
    onEscape: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering and ARIA attributes', () => {
    it('renders button with correct default ARIA attributes', () => {
      const { getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')

      expect(button.getAttribute('aria-label')).toBe('Column menu')
      expect(button.getAttribute('aria-haspopup')).toBe('menu')
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(button.getAttribute('tabIndex')).toBe('0')
    })

    it('renders with custom aria-label', () => {
      const { getByRole } = render(
        <ColumnMenuButton {...defaultProps} aria-label='Custom menu' />
      )
      const button = getByRole('button')
      expect(button.getAttribute('aria-label')).toBe('Custom menu')
    })

    it('renders with custom tabIndex', () => {
      const { getByRole } = render(
        <ColumnMenuButton {...defaultProps} tabIndex={5} />
      )
      const button = getByRole('button')
      expect(button.getAttribute('tabIndex')).toBe('5')
    })

    it('renders with expanded state', () => {
      const { getByRole } = render(
        <ColumnMenuButton {...defaultProps} isExpanded={true} />
      )
      const button = getByRole('button')
      expect(button.getAttribute('aria-expanded')).toBe('true')
    })

    it('renders with menuId and controls attribute', () => {
      const { getByRole } = render(
        <ColumnMenuButton {...defaultProps} menuId='menu-123' />
      )
      const button = getByRole('button')
      expect(button.getAttribute('aria-controls')).toBe('menu-123')
    })

    it('renders with custom icon', () => {
      const customIcon = <span data-testid='custom-icon'>📋</span>
      const { getByTestId } = render(
        <ColumnMenuButton {...defaultProps} icon={customIcon} />
      )
      getByTestId('custom-icon')
    })

    it('renders with default icon when no icon provided', () => {
      const { getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      expect(button.textContent).toBe('⋮')
    })
  })

  describe('Mouse interactions', () => {
    it('calls onClick when clicked', async () => {
      const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      await user.click(button)
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
    })

    it('does not call onClick when disabled and clicked', async () => {
      const { user, getByRole } = render(
        <ColumnMenuButton {...defaultProps} disabled={true} />
      )
      const button = getByRole('button')
      await user.click(button)
      expect(defaultProps.onClick).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard interactions', () => {
    it('calls onClick with synthetic event on Enter key', async () => {
      const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      button.focus()
      await user.keyboard('{Enter}')

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
      expect(defaultProps.onClick.mock.calls[0]).toBeDefined()
      const event = (defaultProps.onClick.mock.calls[0]?.[0] ?? {}) as KeyboardEvent
      expect(event.key).toBe('Enter')
      expect(event.preventDefault).toBeDefined()
      expect(event.stopPropagation).toBeDefined()
    })

    it('calls onClick with synthetic event on Space key', async () => {
      const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      button.focus()
      await user.keyboard('{ }')

      expect(defaultProps.onClick).toHaveBeenCalledTimes(1)
      expect(defaultProps.onClick.mock.calls[0]).toBeDefined()
      const event = (defaultProps.onClick.mock.calls[0]?.[0] ?? {}) as KeyboardEvent
      expect(event.key).toBe(' ')
      expect(event.preventDefault).toBeDefined()
      expect(event.stopPropagation).toBeDefined()
    })

    it('calls onEscape when Escape key is pressed', async () => {
      const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      button.focus()
      await user.keyboard('{Escape}')

      expect(defaultProps.onEscape).toHaveBeenCalledTimes(1)
      expect(defaultProps.onEscape.mock.calls[0]).toBeDefined()
      const event = (defaultProps.onEscape.mock.calls[0]?.[0] ?? {}) as KeyboardEvent
      expect(event.key).toBe('Escape')
      expect(event.preventDefault).toBeDefined()
      expect(event.stopPropagation).toBeDefined()
    })

    it('does not call onClick or onEscape when disabled', async () => {
      const { user, getByRole } = render(
        <ColumnMenuButton {...defaultProps} disabled={true} />
      )
      const button = getByRole('button')
      button.focus()

      await user.keyboard('{Enter}')
      await user.keyboard('{ }')
      await user.keyboard('{Escape}')

      expect(defaultProps.onClick).not.toHaveBeenCalled()
      expect(defaultProps.onEscape).not.toHaveBeenCalled()
    })

    it('ignores other key presses', async () => {
      const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
      const button = getByRole('button')
      button.focus()

      await user.keyboard('a')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{Tab}')

      expect(defaultProps.onClick).not.toHaveBeenCalled()
      expect(defaultProps.onEscape).not.toHaveBeenCalled()
    })
  })

  describe('Disabled state', () => {
    it('sets correct ARIA attributes when disabled', () => {
      const { getByRole } = render(
        <ColumnMenuButton {...defaultProps} disabled={true} />
      )
      const button = getByRole('button') as HTMLButtonElement
      expect(button.getAttribute('tabIndex')).toBe('-1')
      expect(button.disabled).toBe(true)
    })

    it('does not call handlers when disabled', async () => {
      const { user, getByRole } = render(
        <ColumnMenuButton {...defaultProps} disabled={true} />
      )
      const button = getByRole('button')

      await user.click(button)
      button.focus()
      await user.keyboard('{Enter}')
      await user.keyboard('{ }')
      await user.keyboard('{Escape}')

      expect(defaultProps.onClick).not.toHaveBeenCalled()
      expect(defaultProps.onEscape).not.toHaveBeenCalled()
    })
  })

  describe('Optional callbacks', () => {
    it('works without onClick handler', async () => {
      const { user, getByRole } = render(
        <ColumnMenuButton onEscape={defaultProps.onEscape} />
      )
      const button = getByRole('button')

      await user.click(button)
      button.focus()
      await user.keyboard('{Enter}')

      // Should not throw errors
    })

    it('works without onEscape handler', async () => {
      const { user, getByRole } = render(
        <ColumnMenuButton onClick={defaultProps.onClick} />
      )
      const button = getByRole('button')
      button.focus()

      await user.keyboard('{Escape}')

      // Should not throw errors
    })

    it('works without any handlers', async () => {
      const { user, getByRole } = render(<ColumnMenuButton />)
      const button = getByRole('button')

      await user.click(button)
      button.focus()
      await user.keyboard('{Enter}')
      await user.keyboard('{Escape}')

      // Should not throw errors
    })
  })
})
