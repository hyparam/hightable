import { describe, expect, it } from 'vitest'
import { act, fireEvent } from '@testing-library/react'

import { render } from '../../utils/userEvent.js'
import Cell from './Cell.js'

const rest = {
  ariaColIndex: 1,
  ariaRowIndex: 1,
  columnIndex: 0,
  stringify: (d: unknown) => d === undefined ? 'undefined' : JSON.stringify(d),
  // Note that HighTable defaults to another stringifier - we don't test this here
}
describe('Cell', () => {
  it.each([
    ['test', '"test"'],
    [123, '123'],
    [null, 'null'],
    [undefined, 'undefined'],
    [[1, 2, 3], '[1,2,3]'],
  ])('renders the value (%s) as string by default: %s', (value, text) => {
    const { getByText } = render(<table>
      <tbody>
        <tr>
          <Cell
            cell={{ value }}
            {...rest}
          ></Cell>
        </tr>
      </tbody>
    </table>)
    getByText(text)
  })

  it('renders custom content when renderCellContent is provided', () => {
    const { getByText } = render(
      <table>
        <tbody>
          <tr>
            <Cell
              cell={{ value: 'custom' }}
              renderCellContent={({ cell }) => <span>Value: {String(cell?.value)}</span>}
              {...rest}
            ></Cell>
          </tr>
        </tbody>
      </table>
    )
    getByText('Value: custom')
  })

  it('copies the cell content to clipboard on copy event', async () => {
    const { getByText } = render(
      <table>
        <tbody>
          <tr>
            <Cell
              cell={{ value: 123 }}
              {...rest}
            ></Cell>
          </tr>
        </tbody>
      </table>
    )
    const cell = getByText('123')
    cell.focus()
    act(() => {
      // using fireEvent instead of userEvent - I cannot find how to do it with userEvent
      fireEvent.copy(cell)
    })
    const text = await navigator.clipboard.readText()
    expect(text).toBe('123')
    // Note that the text is not copied if a selection exists. But I don't know how to test that yet.
  })
})
