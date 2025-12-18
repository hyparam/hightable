import { act, fireEvent } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { render } from '../../utils/userEvent.js'
import RowHeader from './RowHeader.js'

const defaultProps = {
  ariaColIndex: 1,
  ariaRowIndex: 1,
}

describe('RowHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it.each([
    [0, '1'],
    [1234, '1,235'],
  ])('copies the row number to clipboard on copy event', async (rowNumber, expectedText) => {
    const { getByRole } = render(
      <table>
        <tbody>
          <tr>
            <RowHeader
              rowNumber={rowNumber}
              {...defaultProps}
            />
          </tr>
        </tbody>
      </table>
    )
    const cell = getByRole('rowheader')
    cell.focus()
    act(() => {
      // using fireEvent instead of userEvent - I cannot find how to do it with userEvent
      fireEvent.copy(cell)
    })

    const text = await navigator.clipboard.readText()
    expect(text).toBe(expectedText)
    // Note that the text is not copied if a selection exists. But I don't know how to test that yet.
  })

  it('does not copy anything if the row number is not passed', async () => {
    const { getByRole } = render(
      <table>
        <tbody>
          <tr>
            <RowHeader
              {...defaultProps}
            />
          </tr>
        </tbody>
      </table>
    )
    const cell = getByRole('rowheader')
    cell.focus()
    act(() => {
      // using fireEvent instead of userEvent - I cannot find how to do it with userEvent
      fireEvent.copy(cell)
    })

    await expect(navigator.clipboard.readText()).rejects.toThrow() // because nothing was copied
    // Note that the text is not copied if a selection exists. But I don't know how to test that yet.
  })
})
