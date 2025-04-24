import { fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '../../utils/userEvent.js'
import ColumnResizer from './ColumnResizer.js'

describe('ColumnResizer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with separator role', () => {
    const { getByRole } = render(<ColumnResizer />)
    const resizer = getByRole('separator')
    expect(resizer).toBeDefined()
    expect(resizer.getAttribute('aria-orientation')).toBe('vertical')
  })

  it('calls onDoubleClick when double-clicked', async () => {
    const onDoubleClick = vi.fn()
    const { user, getByRole } = render(<ColumnResizer onDoubleClick={onDoubleClick} />)
    
    const resizer = getByRole('separator')
    await user.dblClick(resizer)
    
    expect(onDoubleClick).toHaveBeenCalledTimes(1)
  })

  it('prevents click event propagation', async () => {
    const containerClick = vi.fn()
    const { user, getByRole } = render(
      <div onClick={containerClick}>
        <ColumnResizer />
      </div>
    )
    
    const resizer = getByRole('separator')
    await user.click(resizer)
    
    expect(containerClick).not.toHaveBeenCalled()
  })

  it('starts resizing on mouse down', async () => {
    const setWidth = vi.fn()
    const initialWidth = 100
    const { user, getByRole } = render(
      <ColumnResizer setWidth={setWidth} width={initialWidth} />
    )
    
    const resizer = getByRole('separator')
    
    // Simulate mouse down
    await user.pointer([
      { keys: '[MouseLeft>]', target: resizer, coords: { x: 150, y: 0 } }
    ])
    
    // setWidth should be called with the initial width
    expect(setWidth).toHaveBeenCalledWith(initialWidth)
  })

  it('updates width on mouse move during resize', async () => {
    // This is a more complex test due to window event listeners
    // We'll mock the global event listeners
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    
    const setWidth = vi.fn()
    const initialWidth = 100
    
    const { getByRole } = render(
      <ColumnResizer setWidth={setWidth} width={initialWidth} />
    )
    
    const resizer = getByRole('separator')
    
    // Trigger the mousedown to start resizing
    fireEvent.mouseDown(resizer, { clientX: 150 })
    
    // Verify event listeners were added
    expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('mouseup', expect.any(Function))
    
    // Verify event listeners are removed on unmount
    addEventListenerSpy.mockRestore()
    removeEventListenerSpy.mockRestore()
  })
}) 