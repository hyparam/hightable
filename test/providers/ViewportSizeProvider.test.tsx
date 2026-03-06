import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { SetViewportSizeContext, ViewportHeightContext, ViewportWidthContext } from '../../src/contexts/ViewportSizeContext.js'
import { ViewportSizeProvider } from '../../src/providers/ViewportSizeProvider.js'

function TestComponent() {
  const viewportWidth = useContext(ViewportWidthContext)
  const viewportHeight = useContext(ViewportHeightContext)
  const setViewportSize = useContext(SetViewportSizeContext)
  return (
    <div>
      <div data-testid="width">
        {viewportWidth}
      </div>
      <div data-testid="height">
        {viewportHeight}
      </div>
      <button data-testid="set-size" onClick={() => setViewportSize?.({ clientWidth: 200, clientHeight: 100 } as HTMLElement)}>Set Size</button>
      <button data-testid="set-size-to-zero" onClick={() => setViewportSize?.({ clientWidth: 0, clientHeight: 0 } as HTMLElement)}>Set Size to Zero</button>
    </div>
  )
}

describe('ViewportSizeProvider', () => {
  it('provides the table corner size and a callback to update it', () => {
    const { getByTestId } = render(
      <ViewportSizeProvider>
        <TestComponent />
      </ViewportSizeProvider>
    )

    // Initially, the size is undefined
    expect(getByTestId('width').textContent).toBe('')
    expect(getByTestId('height').textContent).toBe('')

    // Click the button to set the size
    act(() => {
      getByTestId('set-size').click()
    })

    // After clicking the button, the size should be updated
    expect(getByTestId('width').textContent).toBe('200')
    expect(getByTestId('height').textContent).toBe('100')
  })

  it('falls back to a default height when the height is zero (for tests in Node.js)', () => {
    const { getByTestId } = render(
      <ViewportSizeProvider>
        <TestComponent />
      </ViewportSizeProvider>
    )

    // Click the button to set the size to zero
    act(() => {
      getByTestId('set-size-to-zero').click()
    })

    // After clicking the button, the width should be updated to 0, but the height should fall back to the default value (100)
    expect(getByTestId('width').textContent).toBe('0')
    expect(getByTestId('height').textContent).toBe('100')
  })
})
