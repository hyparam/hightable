import { act, render } from '@testing-library/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'

import { SetTableCornerSizeContext, TableCornerHeightContext, TableCornerWidthContext } from '../../src/contexts/TableCornerSizeContext.js'
import { rowHeight } from '../../src/helpers/constants.js'
import { TableCornerSizeProvider } from '../../src/providers/TableCornerSizeProvider.js'

function TestComponent() {
  const tableCornerWidth = useContext(TableCornerWidthContext)
  const tableCornerHeight = useContext(TableCornerHeightContext)
  const setTableCornerSize = useContext(SetTableCornerSizeContext)
  return (
    <div>
      <div data-testid="width">
        {tableCornerWidth}
      </div>
      <div data-testid="height">
        {tableCornerHeight}
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

    // Initially, the width is undefined and the height is the default value
    expect(getByTestId('width').textContent).toBe('')
    expect(getByTestId('height').textContent).toBe(rowHeight.toString())

    // Click the button to set the size
    act(() => {
      getByTestId('set-size').click()
    })

    // After clicking the button, the size should be updated
    expect(getByTestId('width').textContent).toBe('200')
    expect(getByTestId('height').textContent).toBe('100')
  })
})
