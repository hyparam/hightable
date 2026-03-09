import { act, fireEvent } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Cell from '../../src/components/Cell.js'
import { RenderCellContentContext, StringifyContext } from '../../src/contexts/CellConfigurationContext.js'
import { render } from '../../src/utils/userEvent.js'

function stringify(d: unknown) {
  // Note that HighTable defaults to another stringifier - we don't test this here
  return d === undefined ? 'undefined' : JSON.stringify(d)
}

const rest = {
  ariaColIndex: 1,
  ariaRowIndex: 1,
  columnIndex: 0,
  visibleColumnIndex: 0,
}
describe('Cell', () => {
  it.each([
    ['test', '"test"'],
    [123, '123'],
    [null, 'null'],
    [undefined, 'undefined'],
    [[1, 2, 3], '[1,2,3]'],
  ])('renders the value (%s) as string by default: %s', (value, text) => {
    const { getByText } = render(
      <StringifyContext.Provider value={stringify}>
        <table>
          <tbody>
            <tr>
              <Cell
                cellValue={value}
                hasResolved={true}
                {...rest}
              />
            </tr>
          </tbody>
        </table>
      </StringifyContext.Provider>
    )
    getByText(text)
  })

  it('renders custom content when renderCellContent is provided', () => {
    const { getByText } = render(
      <StringifyContext.Provider value={stringify}>
        <RenderCellContentContext.Provider value={({ cell }) => (
          <span>
            {`Value: ${cell?.value}`}
          </span>
        )}
        >
          <table>
            <tbody>
              <tr>
                <Cell
                  cellValue="custom"
                  hasResolved={true}
                  {...rest}
                />
              </tr>
            </tbody>
          </table>
        </RenderCellContentContext.Provider>
      </StringifyContext.Provider>
    )
    getByText('Value: custom')
  })

  it('copies the cell content to clipboard on copy event', async () => {
    const { getByText } = render(
      <StringifyContext.Provider value={stringify}>
        <table>
          <tbody>
            <tr>
              <Cell
                cellValue={123}
                hasResolved={true}
                {...rest}
              />
            </tr>
          </tbody>
        </table>
      </StringifyContext.Provider>
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
