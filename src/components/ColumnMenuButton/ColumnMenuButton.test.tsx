import { describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnMenuButton from './ColumnMenuButton.js'

describe('ColumnMenuButton', () => {
  it('renders correctly', () => {
    const onClick = vi.fn()
    const { getByRole } = render(<ColumnMenuButton onClick={onClick} />)

    const button = getByRole('button')
    expect(button).toBeDefined()
    expect(button.getAttribute('aria-label')).toBe('Column options')
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const { user, getByRole } = render(<ColumnMenuButton onClick={onClick} />)

    const button = getByRole('button')
    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('stops event propagation when clicked', async () => {
    const onClick = vi.fn()
    const containerClick = vi.fn()

    const { user, getByRole } = render(
      <div onClick={containerClick}>
        <ColumnMenuButton onClick={onClick} />
      </div>
    )

    const button = getByRole('button')
    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(containerClick).not.toHaveBeenCalled()
  })
})
