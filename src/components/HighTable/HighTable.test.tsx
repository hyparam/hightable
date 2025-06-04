import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataFrame, sortableDataFrame } from '../../helpers/dataframe.js'
import { MaybeColumnState } from '../../hooks/useColumnStates.js'
import { wrapResolved } from '../../utils/promise.js'
import { render } from '../../utils/userEvent.js'
import HighTable, { columnStatesSuffix } from './HighTable.js'

Element.prototype.scrollIntoView = vi.fn()

const data: DataFrame = {
  header: ['ID', 'Count', 'Double', 'Triple'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapResolved(index + start),
    cells: {
      ID: wrapResolved(`row ${index + start}`),
      Count: wrapResolved(1000 - start - index),
      Double: wrapResolved((1000 - start - index) * 2),
      Triple: wrapResolved((1000 - start - index) * 3),
    },
  })),
}

const otherData: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapResolved(index + start),
    cells: {
      ID: wrapResolved(`other ${index + start}`),
      Count: wrapResolved(1000 - start - index),
    },
  })),
}

async function setFocusOnScrollableDiv(user: UserEvent) {
  await user.keyboard('{Shift>}{Tab}{/Shift}')
}
async function setFocusOnCellCol3Row3(user: UserEvent) {
  await user.keyboard('{Right}{Right}{Down}{Down}')
}

describe('HighTable', () => {
  const mockData = {
    header: ['ID', 'Name', 'Age'],
    numRows: 100,
    rows: vi.fn(({ start, end }: { start: number, end: number }) => Array.from({ length: end - start }, (_, index) => ({
      index: wrapResolved(index + start),
      cells: {
        ID: wrapResolved(index + start),
        Name: wrapResolved(`Name ${index + start}`),
        Age: wrapResolved(20 + index % 50),
      },
    }))
    ),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial rows', async () => {
    const { getByText } = render(<HighTable data={mockData} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith({ start: 0, end: 24, orderBy: [] })
    })
  })

  it('uses overscan option', async () => {
    const { getByText } = render(<HighTable data={mockData} overscan={10} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith({ start: 0, end: 14, orderBy: [] })
    })
  })

  it('creates the rows after having fetched the data', () => {
    const { queryByRole } = render(<HighTable data={mockData}/>)
    expect(queryByRole('cell', { name: 'Name 0' })).toBeDefined()
  })

  it('handles scroll to load more rows', async () => {
    const { getByLabelText } = render(<HighTable className="myclass" data={mockData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledTimes(1)
      expect(mockData.rows).toHaveBeenCalledWith({ start: 0, end: 24, orderBy: [] })
    })

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledWith({ start: 0, end: 39, orderBy: [] })
    })
  })

  it('correctly handles double click on cell', async () => {
    const mockDoubleClick = vi.fn()
    const { user, findByText } = render(<HighTable data={mockData} onDoubleClickCell={mockDoubleClick} />)
    const cell = await findByText('Name 0')

    await user.dblClick(cell)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 1, 0)
  })

  it('correctly handles middle click on cell', async () => {
    const mockMiddleClick = vi.fn()
    const { user, findByText } = render(<HighTable data={mockData} onMouseDownCell={mockMiddleClick} />)
    const cell = await findByText('Name 0')

    await user.pointer({ keys: '[MouseMiddle>]', target: cell }) // press the middle mouse button without releasing it

    expect(mockMiddleClick).toHaveBeenCalledWith(expect.anything(), 1, 0)
  })

  it('correctly handles key down on cell', async () => {
    const mockKeyDown = vi.fn()
    const { user, findByText } = render(<HighTable data={mockData} onKeyDownCell={mockKeyDown} />)
    const cell = await findByText('Name 0')
    cell.focus()

    await user.keyboard('{Enter}')

    expect(mockKeyDown).toHaveBeenCalledWith(expect.anything(), 1, 0)
  })

  it('displays error when data fetch fails', async () => {
    const mockOnError = vi.fn()
    mockData.rows.mockRejectedValueOnce(new Error('Failed to fetch data'))
    const { container } = render(<HighTable data={mockData} onError={mockOnError} />)

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
    })
    // Clear pending state on error:
    expect(container.querySelector('div.pending')).toBeNull()
  })
})

describe('When sorted, HighTable', () => {
  function checkRowContents(row: HTMLElement | undefined, rowNumber: string, ID: string, Count: string) {
    expect(row).toBeDefined()
    if (!row) {
      throw new Error('Row is undefined')
    }

    const selectionCell = within(row).getByRole('rowheader')
    expect(selectionCell).toBeDefined()
    expect(selectionCell.textContent).toBe(rowNumber)

    const columns = within(row).getAllByRole('cell')
    expect(columns).toHaveLength(4)
    expect(columns[0]?.textContent).toBe(ID)
    expect(columns[1]?.textContent).toBe(Count)
  }

  it('shows the rows in the right order', async () => {
    const { user, findByRole, getByRole, findAllByRole } = render(<HighTable data={sortableDataFrame(data)} />)

    expect(getByRole('columnheader', { name: 'ID' })).toBeDefined()
    await findByRole('cell', { name: 'row 0' })

    const table = getByRole('grid') // not table! because the table is interactive. See https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role
    // first rowgroup is for the thead second is for tbody
    const tbody = within(table).getAllByRole('rowgroup')[1]
    let rows = tbody ? within(tbody).getAllByRole('row') : []
    checkRowContents(rows[0], '1', 'row 0', '1,000')

    // Click on the Count header to sort by Count (none -> ascending)
    const countHeader = getByRole('columnheader', { name: 'Count' })
    await user.click(countHeader)
    await findAllByRole('cell', { name: 'row 999' })

    let rowGroups = within(getByRole('grid')).getAllByRole('rowgroup')[1]
    rows = rowGroups ? within(rowGroups).getAllByRole('row') : []
    checkRowContents(rows[0], '1,000', 'row 999', '1')

    // Click again on the Count header to sort by descending Count (ascending -> descending)
    await user.click(countHeader)
    await findAllByRole('cell', { name: 'row 0' })

    rowGroups = within(getByRole('grid')).getAllByRole('rowgroup')[1]
    rows = rowGroups ? within(rowGroups).getAllByRole('row') : []
    checkRowContents(rows[0], '1', 'row 0', '1,000')

    // Click again on the Count header to remove the sort (descending -> none)
    await user.click(countHeader)
    await findAllByRole('cell', { name: 'row 0' })

    rowGroups = within(getByRole('grid')).getAllByRole('rowgroup')[1]
    rows = rowGroups ? within(rowGroups).getAllByRole('row') : []
    checkRowContents(rows[0], '1', 'row 0', '1,000')

    // Click on the Count header to sort by Count (none -> ascending)
    await user.click(countHeader)
    await findAllByRole('cell', { name: 'row 999' })

    rowGroups = within(getByRole('grid')).getAllByRole('rowgroup')[1]
    rows = rowGroups ? within(rowGroups).getAllByRole('row') : []
    checkRowContents(rows[0], '1,000', 'row 999', '1')
  })

  it('provides the double click callback with the right row index', async () => {
    const mockDoubleClick = vi.fn()
    const { user, findByRole, getByRole } = render(<HighTable data={sortableDataFrame(data)} onDoubleClickCell={mockDoubleClick} />)
    const cell0 = await findByRole('cell', { name: 'row 0' })

    await user.dblClick(cell0)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 0, 0)
    vi.clearAllMocks()

    // Click on the Count header to sort by Count
    const countHeader = getByRole('columnheader', { name: 'Count' })
    await user.click(countHeader)

    const cell999 = await findByRole('cell', { name: 'row 999' })

    await user.dblClick(cell999)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 0, 999)

    // Click on the Count header to sort by descending Count
    await user.click(countHeader)

    const cell00 = await findByRole('cell', { name: 'row 0' })

    await user.dblClick(cell00)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 0, 0)
  })
})

describe('in controlled selection state (selection and onSelection props), ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HighTable shows the selection if passed', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { findByRole, getAllByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const row = await findByRole('row', { selected: true })
    expect(row.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
    expect(getAllByRole('row', { selected: true })).toHaveLength(1)
  })

  it('the table is marked as multiselectable', () => {
    const selection = { ranges: [] }
    const onSelectionChange = vi.fn()
    const { getByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('HighTable shows the new selection if updated, and onSelectionChange is not called', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { getAllByRole, findByRole, rerender } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const other = 5
    const newSelection = { ranges: [{ start: other, end: other + 1 }], anchor: other }
    rerender(<HighTable data={data} selection={newSelection} onSelectionChange={onSelectionChange}/>)
    // no need to await because the data is already fetched
    const selectedRows = getAllByRole('row', { selected: true })
    expect(selectedRows).toHaveLength(1)
    expect(selectedRows[0]?.getAttribute('aria-rowindex')).toBe(`${other + 2}`)
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('removing selection prop is ignored and a warning is printed in the console', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    console.warn = vi.fn()

    const { queryByRole, findByRole, rerender } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })
    expect(console.warn).not.toHaveBeenCalled()

    const newSelection = undefined
    rerender(<HighTable data={data} selection={newSelection} onSelectionChange={onSelectionChange}/>)
    // no need to await because the data is already fetched
    expect(queryByRole('row', { selected: true })).toBeDefined()
    expect(console.warn).toHaveBeenNthCalledWith(1, expect.stringMatching(/cannot be set to undefined/))
  })

  it('on data change, onSelection is not called and the selection stays the same', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { rerender, findByRole, queryByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })
    const row = cell.closest('[role="row"]')
    expect(row?.getAttribute('aria-selected')).toBe('true')
    expect(row?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    rerender(<HighTable data={otherData} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await again, since we have to wait for the new data to be fetched
    const other = await findByRole('cell', { name: 'other 2' })
    expect(queryByRole('cell', { name: 'row 2' })).toBeNull()
    const otherRow = other.closest('[role="row"]')
    expect(otherRow?.getAttribute('aria-selected')).toBe('true')
    expect(otherRow?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it.for([
    { 'kind': 'click' },
    { 'kind': 'press', 'key': 'Enter' },
    { 'kind': 'press', 'key': ' ' },
  ])('click or press Enter/Space on a row number cell calls onSelection with the row selected, but changing nothing to the DOM', async ({ kind, key }) => {
    const start = 2
    const selection = { ranges: [] }
    const onSelectionChange = vi.fn()
    const { user, findByRole, queryByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()

    if (!rowHeader) throw new Error('rowHeader is null')

    if (kind === 'click') {
      await user.click(rowHeader)
    } else {
      // move the focus to the row header
      await user.click(cell)
      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(rowHeader)
      // press the key
      await user.keyboard(`{${key}}`)
    }

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start, end: start + 1 }], anchor: start })
    expect(queryByRole('row', { selected: true })).toBeNull()
  })

  it.for([
    { 'kind': 'click' },
    { 'kind': 'press', 'key': 'Enter' },
    { 'kind': 'press', 'key': ' ' },
  ])('click or press Enter/Space on a selected row number cell calls unselects the row', async ({ kind, key }) => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { user, findByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const row = await findByRole('row', { selected: true })
    onSelectionChange.mockClear()

    const rowHeader = row.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    if (!rowHeader) throw new Error('rowHeader is null')

    if (kind === 'click') {
      await user.click(rowHeader)
    } else {
      // move the focus to the row header
      const dataCell = row.querySelector('td')
      if (!dataCell) throw new Error('dataCell is null')
      await user.click(dataCell)
      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(rowHeader)
      // press the key
      await user.keyboard(`{${key}}`)
    }

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [], anchor: start })
  })

  it('shift+click expands the selection', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { user, findByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const other = 5
    const cell = await findByRole('cell', { name: `row ${other}` })
    onSelectionChange.mockClear()
    const otherRowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(otherRowHeader).not.toBeNull()
    if (!otherRowHeader) throw new Error('otherRowHeader is null')

    // see https://testing-library.com/docs/user-event/setup/#starting-a-session-per-setup
    await user.keyboard('[ShiftLeft>]') // Press Shift (without releasing it)
    await user.click(otherRowHeader) // Perform a click with `shiftKey: true`

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: start, end: other + 1 }], anchor: other })
  })
})

describe('in controlled selection state, read-only (selection prop), ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HighTable shows the selection if passed', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const { findByRole, getAllByRole } = render(<HighTable data={data} selection={selection}/>)
    // await because we have to wait for the data to be fetched first
    const row = await findByRole('row', { selected: true })
    expect(row.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
    expect(getAllByRole('row', { selected: true })).toHaveLength(1)
  })

  it('the table is marked as multiselectable', () => {
    const selection = { ranges: [] }
    const { getByRole } = render(<HighTable data={data} selection={selection}/>)
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('HighTable shows the new selection if updated', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const { getAllByRole, findByRole, rerender } = render(<HighTable data={data} selection={selection}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })

    const other = 5
    const newSelection = { ranges: [{ start: other, end: other + 1 }], anchor: other }
    rerender(<HighTable data={data} selection={newSelection}/>)
    // no need to await because the data is already fetched
    const selectedRows = getAllByRole('row', { selected: true })
    expect(selectedRows).toHaveLength(1)
    expect(selectedRows[0]?.getAttribute('aria-rowindex')).toBe(`${other + 2}`)
  })

  it('on data change, the selection stays the same', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const { rerender, findByRole, queryByRole } = render(<HighTable data={data} selection={selection}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })
    const row = cell.closest('[role="row"]')
    expect(row?.getAttribute('aria-selected')).toBe('true')
    expect(row?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)

    rerender(<HighTable data={otherData} selection={selection}/>)
    // await again, since we have to wait for the new data to be fetched
    const other = await findByRole('cell', { name: 'other 2' })
    expect(queryByRole('cell', { name: 'row 2' })).toBeNull()
    const otherRow = other.closest('[role="row"]')
    expect(otherRow?.getAttribute('aria-selected')).toBe('true')
    expect(otherRow?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
  })

  it.for([
    { 'kind': 'click' },
    { 'kind': 'press', 'key': 'Enter' },
    { 'kind': 'press', 'key': ' ' },
  ])('click or press Enter/Space on a row number cell does nothing', async ({ kind, key }) => {
    const selection = { ranges: [] }
    const { user, findByRole, queryByRole } = render(<HighTable data={data} selection={selection}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    if (!rowHeader) {
      throw new Error('rowHeader should be defined')
    }

    if (kind === 'click') {
      await user.click(rowHeader)
    } else {
      // move the focus to the row header
      await user.click(cell)
      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(rowHeader)
      // press the key
      await user.keyboard(`{${key}}`)
    }

    expect(queryByRole('row', { selected: true })).toBeNull()
  })
})

describe('in uncontrolled selection state (onSelection prop), ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HighTable shows no selection initially and onSelectionChange is not called', async () => {
    const onSelectionChange = vi.fn()
    const { findByRole, queryByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })
    expect(queryByRole('row', { selected: true })).toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('the table is marked as multiselectable', () => {
    const onSelectionChange = vi.fn()
    const { getByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('true')
  })

  it.for([
    { 'kind': 'click' },
    { 'kind': 'press', 'key': 'Enter' },
    { 'kind': 'press', 'key': ' ' },
  ])('Click or press Escape or Enter on a row number cell calls onSelection with the row selected, and changes the DOM to select the row', async ({ kind, key }) => {
    const start = 2
    const onSelectionChange = vi.fn()
    const { user, findByRole, queryByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    if (!rowHeader) throw new Error('rowHeader is null')

    if (kind === 'click') {
      await user.click(rowHeader)
    } else {
      // move the focus to the row header
      await user.click(cell)
      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(rowHeader)
      // press the key
      await user.keyboard(`{${key}}`)
    }

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start, end: start + 1 }], anchor: start })
    expect(queryByRole('row', { selected: true })?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
  })

  it('on data change, the DOM is updated to unselect the rows', async () => {
    const start = 2
    const onSelectionChange = vi.fn()
    const { user, rerender, findByRole, queryByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    // select a row
    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()

    if (!rowHeader) throw new Error('rowHeader is null')
    await user.click(rowHeader)

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start, end: start + 1 }], anchor: start })

    rerender(<HighTable data={otherData} onSelectionChange={onSelectionChange}/>)
    // await again, since we have to wait for the new data to be fetched
    await findByRole('cell', { name: 'other 2' })
    expect(queryByRole('cell', { name: 'row 2' })).toBeNull()
    expect(queryByRole('row', { selected: true })).toBeNull()
    onSelectionChange.mockClear()
    // all the internal state is reset when the data changes, and onSelectionChange is not called on initialization
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('passing the selection prop is ignored and a warning is printed in the console', async () => {
    const start = 2
    const selection = undefined
    const onSelectionChange = vi.fn()
    console.warn = vi.fn()

    const { queryByRole, findByRole, rerender } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })
    expect(queryByRole('row', { selected: true })).toBeNull()
    expect(console.warn).not.toHaveBeenCalled()

    const newSelection = { ranges: [{ start, end: start + 1 }], anchor: start }
    rerender(<HighTable data={data} selection={newSelection} onSelectionChange={onSelectionChange}/>)
    // no need to await because the data is already fetched
    expect(queryByRole('row', { selected: true })).toBeNull()
    expect(console.warn).toHaveBeenNthCalledWith(1, expect.stringMatching(/cannot be set to a value/))
  })

  it.for(['Control', 'Meta'])('%s+A selects all the rows', async (ctrlKey) => {
    const onSelectionChange = vi.fn()
    console.warn = vi.fn()

    const { user, queryAllByRole, findByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })

    // no selected rows
    expect(queryAllByRole('row', { selected: true }).length).toBe(0)

    // move the focus to a cell
    await setFocusOnCellCol3Row3(user)
    // press ctrlKey+A
    await user.keyboard(`{${ctrlKey}>}a{/${ctrlKey}}`)

    // all the rows are selected
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 0, end: data.numRows }] })
    expect(queryAllByRole('row', { selected: true }).length).toBeGreaterThan(10)

    // press ctrlKey+A again
    await user.keyboard(`{${ctrlKey}>}a{/${ctrlKey}}`)

    // no selected rows
    expect(queryAllByRole('row', { selected: true }).length).toBe(0)
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [] })
  })

  it('pressing Escape unselects the rows', async () => {
    const onSelectionChange = vi.fn()

    const { user, queryAllByRole, findByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })

    // no selected rows
    expect(queryAllByRole('row', { selected: true }).length).toBe(0)

    // move the focus to a cell
    await setFocusOnCellCol3Row3(user)
    // select all the rows
    await user.keyboard('{Control>}{a}{/Control}')
    // all the rows are selected
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 0, end: data.numRows }] })
    expect(queryAllByRole('row', { selected: true }).length).toBeGreaterThan(10)

    // press Escape
    await user.keyboard('{Escape}')

    // no row is selected
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [] })
    expect(queryAllByRole('row', { selected: true }).length).toBe(0)
  })

  it('pressing Shift+Space on a cell toggles the row, and does not take the anchor into account (does not expand the selection)', async () => {
    const onSelectionChange = vi.fn()

    const { user, queryAllByRole, findByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })

    // no selected rows
    expect(queryAllByRole('row', { selected: true }).length).toBe(0)

    // move the focus to a cell
    await setFocusOnCellCol3Row3(user)
    const dataIndex = 1 // aria-rowindex = 3 -> dataIndex = 1 (0-based, and the header row is not counted)

    // Shift+Space selects the row
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: dataIndex, end: dataIndex + 1 }], anchor: dataIndex })
    onSelectionChange.mockClear()
    const selectedRows = queryAllByRole('row', { selected: true })
    expect(selectedRows.length).toBe(1)
    expect(selectedRows[0]?.getAttribute('aria-rowindex')).toBe('3')

    // Move two rows down, and Shift+Space selects the new row, and does not expands the selection
    await user.keyboard('{ArrowDown}{ArrowDown}')
    const newDataIndex = 3 // aria-rowindex = 5 -> dataIndex = 3 (0-based, and the header row is not counted)
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: dataIndex, end: dataIndex + 1 }, { start: newDataIndex, end: newDataIndex + 1 }], anchor: newDataIndex })
    onSelectionChange.mockClear()
    const selectedRows2 = queryAllByRole('row', { selected: true })
    expect(selectedRows2.length).toBe(2)
    expect(selectedRows2[0]?.getAttribute('aria-rowindex')).toBe('3')
    expect(selectedRows2[1]?.getAttribute('aria-rowindex')).toBe('5')

    // Shift+Space again unselects the row
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: dataIndex, end: dataIndex + 1 }], anchor: newDataIndex })
    onSelectionChange.mockClear()
    const selectedRows3 = queryAllByRole('row', { selected: true })
    expect(selectedRows3.length).toBe(1)
    expect(selectedRows3[0]?.getAttribute('aria-rowindex')).toBe('3')
  })
})

describe('in disabled selection state (neither selection nor onSelection props), ', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the table is not marked as multiselectable', () => {
    const { getByRole } = render(<HighTable data={data}/>)
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('false')
  })

  it.for([
    { 'kind': 'click' },
    { 'kind': 'press', 'key': 'Enter' },
    { 'kind': 'press', 'key': ' ' },
  ])('click, or press Enter/Space, on a row number cell does nothing', async ({ kind, key }) => {
    const { user, findByRole, queryByRole } = render(<HighTable data={data}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    if (!rowHeader) throw new Error('rowHeader is null')

    if (kind === 'click') {
      await user.click(rowHeader)
    } else {
      // move the focus to the row header
      await user.click(cell)
      await user.keyboard('{Home}')
      expect(document.activeElement).toBe(rowHeader)
      // press the key
      await user.keyboard(`{${key}}`)
    }

    expect(queryByRole('row', { selected: true })).toBeNull()
  })
})

const initialWidth = 62 // initial width of the columns, in pixels, above the default minimal width of 50px
const getOffsetWidth = vi.fn(() => initialWidth)
const getClientWidth = vi.fn(() => 1000) // used to get the width of the table - let's give space
const keyItem = `key${columnStatesSuffix}`
const undefinedItem = `undefined${columnStatesSuffix}`
vi.mock(import('../../helpers/width.js'), async (importOriginal ) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getOffsetWidth: () => getOffsetWidth(),
    getClientWidth: () => getClientWidth(),
  }})
describe('HighTable localstorage', () => {
  it('only saves the fixed widths', () => {
    localStorage.clear()
    render(<HighTable data={data} cacheKey="key" />)
    expect(getClientWidth).toHaveBeenCalled()
    const json = localStorage.getItem(keyItem)
    expect(json).not.toEqual(null)
    const columnStates = JSON.parse(json ?? '[]') as MaybeColumnState[] // TODO: we could check the type of the column states
    expect(columnStates).toHaveLength(4) // 4 columns
    console.log('columnStates', columnStates)
    columnStates.forEach((columnState) => {
      expect(columnState?.measured).toBeUndefined() // the measured field is not stored
      expect(columnState?.width).toBeUndefined() // no columns is fixed
    })
  })
  it('saves nothing on initialization if cacheKey is not provided', () => {
    localStorage.clear()
    render(<HighTable data={data} />)
    expect(getClientWidth).toHaveBeenCalled()
    expect(localStorage.getItem(keyItem)).toBeNull()
    expect(localStorage.getItem(undefinedItem)).toBeNull()
    expect(localStorage.length).toBe(0)
  })
  it('is used to load previously saved column widths', () => {
    localStorage.clear()
    const savedWidth = initialWidth * 2
    const json = JSON.stringify(Array(4).fill({ width: savedWidth }))
    localStorage.setItem(keyItem, json)

    const { getAllByRole } = render(<HighTable data={data} cacheKey="key" />)
    const header = getAllByRole('columnheader')[0]
    if (!header) {
      throw new Error('Header should not be null')
    }
    expect(localStorage.getItem(keyItem)).toEqual(json)
    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
  })
  it('it ignores non-fixed column widths in localStorage', () => {
    localStorage.clear()
    const savedWidth = initialWidth * 2
    localStorage.setItem(keyItem, JSON.stringify(Array(4).fill({ width: savedWidth, measured: savedWidth })))

    const { getAllByRole } = render(<HighTable data={data} cacheKey="key" />)
    const header = getAllByRole('columnheader')[0]
    if (!header) {
      throw new Error('Header should not be null')
    }

    const json = localStorage.getItem(keyItem)
    expect(json).not.toEqual(null)
    const columnStates = JSON.parse(json ?? '[]') as MaybeColumnState[]
    expect(columnStates).toHaveLength(4) // 4 columns
    columnStates.forEach((columnState) => {
      expect(columnState?.measured).toBeUndefined() // the measured field is not stored
      expect(columnState?.width).toBeDefined() // all columns should have been adjusted to some width
    })
  })
  it('the previous data is used or updated if new data are loaded', () => {
    localStorage.clear()
    const savedWidth = initialWidth * 2
    const json = JSON.stringify(Array(4).fill({ width: savedWidth }))
    localStorage.setItem(keyItem, json)

    const { getAllByRole, rerender } = render(<HighTable data={data} cacheKey="key" />)

    const otherKey = 'other-key'
    /* Note that we expect the cache key to be different for different data */
    rerender(<HighTable data={otherData} cacheKey={otherKey} />)
    const header = getAllByRole('columnheader')[0]
    if (!header) {
      throw new Error('Header should not be null')
    }
    expect(localStorage.getItem(`${otherKey}${columnStatesSuffix}`)).not.toEqual(localStorage.getItem(keyItem))
    expect(header.style.maxWidth).not.toEqual(`${savedWidth}px`)
  })
})

describe('Navigating Hightable with the keyboard', () => {
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
    expect(rowIndex).toBeDefined()
    expect(colIndex).toBeDefined()
    return { rowIndex: Number(rowIndex), colIndex: Number(colIndex) }
  }

  const rowIndex = 4
  const colIndex = 3
  const pageSize = 2
  const firstRow = 1
  // const lastRow = data.numRows + 1 // see comments below
  const firstCol = 1
  const lastCol = data.header.length + 1
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
      ['{PageUp}', rowIndex - pageSize, colIndex],
      ['{Shift>}{ }{/Shift}', rowIndex, colIndex], // no op
      ['{PageDown}', rowIndex + pageSize, colIndex],
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
    ])('pressing "%s" moves the focus to the cell (%s, %s)', async (key, expectedRowIndex, expectedColIndex) => {
      const { user } = render(<HighTable data={data} padding={pageSize} />)
      // focus the cell (4, 3)
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowRight}{ArrowRight}')
      expect(getFocusCoordinates()).toEqual({ rowIndex, colIndex })

      await user.keyboard(key)
      expect(getFocusCoordinates()).toEqual({ rowIndex: expectedRowIndex, colIndex: expectedColIndex })
    })
  })

  describe('When a header cell is focused', () => {
    it('the column resizer and the header cell are focusable', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the header cell (ID)
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      // Tab focuses the column resizer
      await user.keyboard('{Tab}')
      const focusedElement = document.activeElement
      if (!focusedElement) {
        throw new Error('Focused element not found')
      }
      expect(focusedElement.getAttribute('role')).toBe('separator')
      // Shift+Tab focuses the header cell again
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      expect(document.activeElement).toBe(cell)
    })

    it('the column resizer is activated on focus, and loses focus when Escape is pressed', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      await user.keyboard('{Tab}')
      // press Enter to activate the column resizer
      const separator = document.activeElement
      if (!separator) {
        throw new Error('Separator is null')
      }
      expect(separator.getAttribute('aria-busy')).toBe('true')
      // escape to deactivate the column resizer
      await user.keyboard('{Escape}')
      expect(separator.getAttribute('aria-busy')).toBe('false')
      expect(document.activeElement).toBe(cell)
    })

    it('the column resizer changes the column width when ArrowRight or ArrowLeft are pressed', async () => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}{Tab}')
      const separator = document.activeElement
      if (!separator) {
        throw new Error('Separator is null')
      }
      const value = separator.getAttribute('aria-valuenow')
      if (value === null) {
        throw new Error('aria-valuenow should not be null')
      }
      // the column measurement is mocked
      await user.keyboard('{ArrowRight}')
      expect(separator.getAttribute('aria-valuenow')).toBe((+value + 10).toString())
      await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}')
      expect(separator.getAttribute('aria-valuenow')).toBe((+value - 20).toString())
    })

    it.for(['{ }', '{Enter}'])('the column resizer autosizes the column and exits resize mode when %s is pressed', async (key) => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}')
      const cell = document.activeElement
      await user.keyboard('{Tab}')
      const separator = document.activeElement
      if (!separator) {
        throw new Error('Separator is null')
      }
      const value = separator.getAttribute('aria-valuenow')
      if (value === null) {
        throw new Error('aria-valuenow should not be null')
      }
      await user.keyboard('{ArrowRight}')
      expect(separator.getAttribute('aria-valuenow')).toBe((+value + 10).toString())
      await user.keyboard(key)
      const valueNow = separator.getAttribute('aria-valuenow')
      if (valueNow === null) {
        throw new Error('aria-valuenow should not be null')
      }
      // the autosized column width (smart fit) is less than the default adjusted width
      expect(+valueNow).toBeLessThan(+value)
      expect(document.activeElement).toBe(cell)
    })

    it.for(['{ }', '{Enter}'])('the column resizer toggles back to adjustable column when %s is pressed if previously autosized', async (key) => {
      const { user } = render(<HighTable data={data} />)
      // go to the column resizer
      await user.keyboard('{ArrowRight}{Tab}')
      const separator = document.activeElement
      if (!separator) {
        throw new Error('Separator is null')
      }
      const initialValue = separator.getAttribute('aria-valuenow')
      // autoresize
      await user.keyboard(key)
      expect(separator.getAttribute('aria-valuenow')).not.toBe(initialValue)
      // focus the resizer again
      await user.keyboard('{Tab}')
      // press the key
      await user.keyboard(key)
      // already autosized - toggles to adjustable width
      expect(separator.getAttribute('aria-valuenow')).toBe(initialValue)
    })
  })
})

describe('When the table scroller is focused', () => {
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
