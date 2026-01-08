import type { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGetRowNumber, validateGetCellParams } from '../../helpers/dataframe/helpers.js'
import { type DataFrame, sortableDataFrame } from '../../helpers/dataframe/index.js'
import type { Obj } from '../../helpers/dataframe/types.js'
import type { OrderBy } from '../../helpers/sort.js'
import { render } from '../../utils/userEvent.js'
import HighTable from './HighTable.js'

Element.prototype.scrollIntoView = vi.fn()

const dataColumnDescriptors = ['ID', 'Count', 'Double', 'Triple'].map(name => ({
  name,
  metadata: { type: 'test' }, // This metadata has no purpose other than testing the types
}))
function createData(): DataFrame<Obj, { type: string }> {
  const columnDescriptors = dataColumnDescriptors
  const numRows = 1000
  const getRowNumber = createGetRowNumber({ numRows })
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) {
    validateGetCellParams({ column, row, orderBy, data: { numRows, columnDescriptors } })
    const count = numRows - row
    if (column === 'ID') {
      return { value: `row ${row}` }
    } else if (column === 'Count') {
      return { value: count }
    } else if (column === 'Double') {
      return { value: count * 2 }
    } else if (column === 'Triple') {
      return { value: count * 3 }
    }
  }
  return { columnDescriptors, numRows, getCell, getRowNumber }
}

async function setFocusOnScrollableDiv(user: UserEvent) {
  await user.keyboard('{Shift>}{Tab}{/Shift}')
}

describe('Navigating HighTable with the keyboard', () => {
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
  })

  describe('On mount, ', () => {
    it('the first cell is focused by default', () => {
      render(<HighTable data={data} />)
      const focusedElement = document.activeElement
      expect(focusedElement?.getAttribute('aria-colindex')).toBe('1')
      expect(focusedElement?.getAttribute('aria-rowindex')).toBe('1')
    })
    it('the first cell is not focused if focus prop is false, and neither is the table scroller', () => {
      render(<HighTable data={data} focus={false} />)
      expect(document.activeElement?.localName).toBe('body')
    })
    it('pressing "Shift+Tab" moves the focus to the scrollable div', async () => {
      const { user, getByLabelText } = render(<HighTable data={data} />)
      const scrollableDiv = getByLabelText('Virtual-scroll table')
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(scrollableDiv)
    })
  })

  describe('When the scrollable div is focused', () => {
    it.for(['{Tab}', '{ }', '{Enter}'])('moves the focus to the first cell when pressing "%s"', async (key) => {
      const { user } = render(<HighTable data={data} />)
      await setFocusOnScrollableDiv(user)
      await user.keyboard(key)
      const focusedElement = document.activeElement
      expect(focusedElement?.getAttribute('aria-colindex')).toBe('1')
      expect(focusedElement?.getAttribute('aria-rowindex')).toBe('1')
    })
    it.for(['{Shift>}{Tab}{/Shift}'])('moves the focus outside of the table when pressing "%s"', async (key) => {
      const { user } = render(<HighTable data={data} />)
      await setFocusOnScrollableDiv(user)
      await user.keyboard(key)
      const focusedElement = document.activeElement
      expect(focusedElement?.localName).toBe('body')
    })
    it.for(['{ArrowUp}', '{ArrowDown}', '{ArrowLeft}', '{ArrowRight}'])('scroll while keeping the focus on the scrollable div when pressing "%s"', async (key) => {
      const { user, getByLabelText } = render(<HighTable data={data} />)
      await setFocusOnScrollableDiv(user)
      const scrollableDiv = getByLabelText('Virtual-scroll table')
      await user.keyboard(key)
      expect(document.activeElement).toBe(scrollableDiv)
    })
    it('pressing "Tab", then "Tab", then "Shift+Tab", then "Shift+Tab" moves the focus back to the scrollable div', async () => {
      const { user, getByLabelText } = render(<HighTable data={data} />)
      await setFocusOnScrollableDiv(user)
      const scrollableDiv = getByLabelText('Virtual-scroll table')
      await user.keyboard('{Tab}')
      expect(document.activeElement).not.toBe(scrollableDiv)
      await user.keyboard('{Tab}')
      expect(document.activeElement).not.toBe(scrollableDiv)
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).not.toBe(scrollableDiv)
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(scrollableDiv)
    })
  })

  function getFocusCoordinates() {
    const focusedElement = document.activeElement
    const rowIndex = focusedElement?.getAttribute('aria-rowindex')
    const colIndex = focusedElement?.getAttribute('aria-colindex')
    expect(rowIndex).toBeTruthy()
    expect(colIndex).toBeTruthy()
    return { rowIndex: Number(rowIndex), colIndex: Number(colIndex) }
  }

  const rowIndex = 4
  const colIndex = 3
  const numRowsPerPage = 2
  const firstRow = 1
  // const lastRow = data.numRows + 1 // see comments below
  const firstCol = 1
  const lastCol = dataColumnDescriptors.length + 1
  describe('When the cell (4,3) is focused', () => {
    it.each([
      ['{ArrowRight}', rowIndex, colIndex + 1],
      ['{Control>}{ArrowRight}{/Control}', rowIndex, lastCol],
      ['{ArrowLeft}', rowIndex, colIndex - 1],
      ['{Control>}{ArrowLeft}{/Control}', rowIndex, firstCol],
      ['{ArrowUp}', rowIndex - 1, colIndex],
      ['{Control>}{ArrowUp}{/Control}', firstRow, colIndex],
      ['{ArrowDown}', rowIndex + 1, colIndex],
      // ['{Control>}{ArrowDown}{/Control}', lastRow, 3], // Cannot be tested because it relies on scroll
      ['{PageUp}', rowIndex - numRowsPerPage, colIndex],
      ['{Shift>}{ }{/Shift}', rowIndex, colIndex], // no op
      ['{PageDown}', rowIndex + numRowsPerPage, colIndex],
      ['{ }', rowIndex, colIndex], // no op
      ['{Home}', rowIndex, firstCol],
      ['{Control>}{Home}{/Control}', firstRow, firstCol],
      ['{End}', rowIndex, lastCol],
      // ['{Control>}{End}{/Control}', lastRow, lastCol], // Cannot be tested because it relies on scroll

      // stop at the borders
      ['{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}', rowIndex, lastCol],
      ['{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}{ArrowLeft}', rowIndex, firstCol],
      ['{ArrowUp}{ArrowUp}{ArrowUp}{ArrowUp}', firstRow, colIndex],
      // don't test ArrowDown because it relies on scroll
      ['{PageUp}{PageUp}{PageUp}{PageUp}', firstRow, colIndex],
      // don't test PageDown because it relies on scroll
      ['{Home}{Home}{Home}{Home}', rowIndex, firstCol],
      ['{End}{End}{End}{End}', rowIndex, lastCol],
      ['{Control>}{Home}{Home}{Home}{Home}{/Control}', firstRow, firstCol],
      // ['{Control>}{End}{End}{End}{End}{/Control}', lastRow, lastCol], // Cannot be tested because it relies on scroll

      // do nothing
      ['{Alt>}{ArrowLeft}{/Alt}', rowIndex, colIndex], // no op
      ['{Meta>}{ArrowLeft}{/Meta}', rowIndex, colIndex], // no op
      ['{Shift>}{ArrowLeft}{/Shift}', rowIndex, colIndex], // no op
    ])('pressing "%s" moves the focus to the cell (%s, %s)', async (key, expectedRowIndex, expectedColIndex) => {
      const { user } = render(<HighTable data={data} numRowsPerPage={numRowsPerPage} />)
      // focus the cell (4, 3)
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}')
      expect(getFocusCoordinates()).toEqual({ rowIndex, colIndex })

      await user.keyboard(key)
      expect(getFocusCoordinates()).toEqual({ rowIndex: expectedRowIndex, colIndex: expectedColIndex })
    })
  })

  describe('When a header cell is focused', () => {
    it('the column resizer, the menu button and the header cell are focusable', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the header cell (ID)
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      // Tab focuses the menu button
      await user.keyboard('{Tab}')
      let focusedElement = document.activeElement
      if (!focusedElement) {
        throw new Error('Focused element not found')
      }
      expect(focusedElement.tagName.toLowerCase()).toBe('button')
      // Tab focuses the column resizer
      await user.keyboard('{Tab}')
      focusedElement = document.activeElement
      if (!focusedElement) {
        throw new Error('Focused element not found')
      }
      expect(focusedElement.getAttribute('role')).toBe('spinbutton')
      // Shift+Tab focuses the menu button again
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      focusedElement = document.activeElement
      if (!focusedElement) {
        throw new Error('Focused element not found')
      }
      expect(focusedElement.tagName.toLowerCase()).toBe('button')
      // Shift+Tab focuses the header cell again
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(cell)
    })

    it('the column resizer is activated on focus, and loses focus when Escape is pressed', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      await user.keyboard('{Tab}{Tab}')
      // press Enter to activate the column resizer
      const spinbutton = document.activeElement
      if (!spinbutton) {
        throw new Error('Separator is null')
      }
      expect(spinbutton.getAttribute('aria-busy')).toBe('true')
      // escape to deactivate the column resizer
      await user.keyboard('{Escape}')
      expect(spinbutton.getAttribute('aria-busy')).toBe('false')
      expect(document.activeElement).toBe(cell)
    })

    it('the column resizer changes the column width when ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ArrowPageUp, ArrowPageDown and Home are pressed', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}{Tab}{Tab}')
      const spinbutton = document.activeElement
      if (!spinbutton) {
        throw new Error('Spinbutton is null')
      }
      const value = spinbutton.getAttribute('aria-valuenow')
      if (value === null) {
        throw new Error('aria-valuenow should not be null')
      }
      // the column measurement is mocked
      await user.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 30).toString())
      await user.keyboard('{ArrowLeft}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 20).toString())
      await user.keyboard('{ArrowUp}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 30).toString())
      await user.keyboard('{ArrowDown}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 20).toString())
      await user.keyboard('{PageUp}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 120).toString())
      await user.keyboard('{PageDown}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 20).toString())
      await user.keyboard('{Home}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((50).toString()) // min width is hardcoded to 50px
    })

    it.for(['{ }', '{Enter}'])('the column resizer autosizes the column and exits resize mode when %s is pressed', async (key) => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      await user.keyboard('{Tab}{Tab}')
      const spinbutton = document.activeElement
      if (!spinbutton) {
        throw new Error('Spinbutton is null')
      }
      // The initial value is autosized
      const value = spinbutton.getAttribute('aria-valuenow')
      if (value === null) {
        throw new Error('aria-valuenow should not be null')
      }
      await user.keyboard('{ArrowRight}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 10).toString())
      await user.keyboard(key)
      const valueNow = spinbutton.getAttribute('aria-valuenow')
      if (valueNow === null) {
        throw new Error('aria-valuenow should not be null')
      }
      // the autosized column width (smart fit) is less than the default adjusted width
      expect(+valueNow).toEqual(+value)
      expect(document.activeElement).toBe(cell)
    })

    it.for(['{ }', '{Enter}'])('the column resizer toggles back to adjustable column when %s is pressed if previously autosized', async (key) => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}{Tab}{Tab}')
      const spinbutton = document.activeElement
      if (!spinbutton) {
        throw new Error('Spinbutton is null')
      }
      // The initial value is autosized
      const initialValue = spinbutton.getAttribute('aria-valuenow')
      // autoresize
      await user.keyboard(key)
      expect(spinbutton.getAttribute('aria-valuenow')).toBe(initialValue)
      // focus the resizer again
      await user.keyboard('{Tab}{Tab}')
      // press the key
      await user.keyboard(key)
      // already autosized - toggles to adjustable width
      expect(spinbutton.getAttribute('aria-valuenow')).toBe(initialValue)
    })

    it.for(['{ }', '{Enter}'])('the column sort is toggled, if the dataframe is sortable, when %s is pressed', async (key) => {
      const sortableData = sortableDataFrame(data)
      const { user, getByRole } = render(<HighTable data={sortableData} />)
      // go to the header cell (ID)
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      const columnHeader = getByRole('columnheader', { name: 'ID' })
      expect(columnHeader.getAttribute('aria-sort')).toBe('none')
      // press the key to sort ascending
      await user.keyboard(key)
      expect(columnHeader.getAttribute('aria-sort')).toBe('ascending')
      // press the key to sort descending
      await user.keyboard(key)
      expect(columnHeader.getAttribute('aria-sort')).toBe('descending')
      // press the key to remove sorting
      await user.keyboard(key)
      expect(columnHeader.getAttribute('aria-sort')).toBe('none')
      expect(document.activeElement).toBe(cell)
    })

    it.for(['{ }', '{Enter}'])('if the dataframe is not sortable, pressing %s when the column header is focused is a no-op', async (key) => {
      const { user, getByRole } = render(<HighTable data={data} />)
      // go to the header cell (Count)
      await user.keyboard('{ArrowRight}{ArrowRight}')
      const columnHeader = getByRole('columnheader', { name: 'Count' })
      expect(columnHeader.getAttribute('aria-sort')).toBe(null)
      // press the key
      await user.keyboard(key)
      // no change
      expect(columnHeader.getAttribute('aria-sort')).toBe(null)
    })
  })
})

describe('When the table scroller is focused', () => {
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
  })

  it('clicking on a cell moves the focus to the cell', async () => {
    // https://github.com/hyparam/hightable/issues/167
    // note that this does not test the CSS, which was the cause of the bug ("pointer-events: none;" was needed)
    const { user, getByLabelText, findByRole } = render(<HighTable data={data} />)
    await setFocusOnScrollableDiv(user)
    const scrollableDiv = getByLabelText('Virtual-scroll table')
    expect(document.activeElement).toBe(scrollableDiv)
    const cell = await findByRole('cell', { name: 'row 0' })
    await user.click(cell)
    expect(document.activeElement).toBe(cell)
  })
})
