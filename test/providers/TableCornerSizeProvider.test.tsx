import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { TableCornerHeightContext, useHeaderHeight, useSetTableCornerSize, useTableCornerWidth } from '../../src/contexts/TableCornerSizeContext.js'
import { TableCornerSizeProvider } from '../../src/providers/TableCornerSizeProvider.js'

function TestComponent() {
  const tableCornerWidth = useTableCornerWidth()
  const tableCornerHeight = useContext(TableCornerHeightContext)
  const headerHeight = useHeaderHeight()
  const setTableCornerSize = useSetTableCornerSize()
  return (
    <div>
      <div data-testid="width">
        {tableCornerWidth}
      </div>
      <div data-testid="height">
        {tableCornerHeight}
      </div>
      <div data-testid="header-height">
        {headerHeight}
      </div>
      <button data-testid="set-size" onClick={() => setTableCornerSize?.({ offsetWidth: 200, offsetHeight: 100 } as HTMLElement)}>Set Size</button>
    </div>
  )
}

describe('TableCornerSizeProvider', () => {
  it('provides the table corner size and a callback to update it', () => {
    const { getByTestId } = render(
      <TableCornerSizeProvider>
        <TestComponent />
      </TableCornerSizeProvider>
    )

    // Initially, the size is undefined
    expect(getByTestId('width').textContent).toBe('')
    expect(getByTestId('height').textContent).toBe('')
    // The header height should be the default row height (33)
    expect(getByTestId('header-height').textContent).toBe('33')

    // Click the button to set the size
    act(() => {
      getByTestId('set-size').click()
    })

    // After clicking the button, the size should be updated
    expect(getByTestId('width').textContent).toBe('200')
    expect(getByTestId('height').textContent).toBe('100')
    expect(getByTestId('header-height').textContent).toBe('100') // the header height should be updated to the new height
  })
})
