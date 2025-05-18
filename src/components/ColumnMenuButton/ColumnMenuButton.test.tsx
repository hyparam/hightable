import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenuButton from './ColumnMenuButton.js'

describe('ColumnMenuButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders button with correct ARIA attributes', () => {
    const { getByRole } = render(<ColumnMenuButton {...defaultProps} />)
    const button = getByRole('button')
    expect(button).toBeDefined()
    expect(button.getAttribute('aria-label')).toBe('Column Menu Button')
    expect(button.getAttribute('tabIndex')).toBe('0')
  })

  it('calls onClick when clicked', async () => {
    const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
    const button = getByRole('button')
    await user.click(button)
    expect(defaultProps.onClick).toHaveBeenCalled()
  })

  it('calls onClick with synthetic event on Enter key', async () => {
    const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
    const button = getByRole('button')
    button.focus()
    await user.keyboard('{Enter}')
    expect(defaultProps.onClick).toHaveBeenCalled()
    const { calls } = defaultProps.onClick.mock
    expect(calls.length).toBeGreaterThan(0)
    const event = calls[0]?.[0] as MouseEvent & { clientX: number; stopPropagation: () => void }
    expect(event.clientX).toBeDefined()
    expect(event.stopPropagation).toBeDefined()
  })

  it('calls onClick with synthetic event on Space key', async () => {
    const { user, getByRole } = render(<ColumnMenuButton {...defaultProps} />)
    const button = getByRole('button')
    button.focus()
    await user.keyboard('{ }')
    expect(defaultProps.onClick).toHaveBeenCalled()
    const { calls } = defaultProps.onClick.mock
    expect(calls.length).toBeGreaterThan(0)
    const event = calls[0]?.[0] as MouseEvent & { clientX: number; stopPropagation: () => void }
    expect(event.clientX).toBeDefined()
    expect(event.stopPropagation).toBeDefined()
  })

  it('uses provided buttonRef if available', () => {
    const buttonRef = { current: null as HTMLDivElement | null }
    render(<ColumnMenuButton {...defaultProps} buttonRef={buttonRef} />)
    expect(buttonRef.current).toBeDefined()
    expect(buttonRef.current?.getAttribute('role')).toBe('button')
  })
})
