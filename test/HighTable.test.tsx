import { act, fireEvent, waitFor, within } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DataFrame, sortableDataFrame } from '../src/dataframe.js'
import HighTable from '../src/HighTable.js'
import { wrapPromise } from '../src/promise.js'
import { render } from './userEvent.js'

const data: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapPromise(index + start),
    cells: {
      ID: wrapPromise(`row ${index + start}`),
      Count: wrapPromise(1000 - start - index),
    },
  })),
}

const otherData: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapPromise(index + start),
    cells: {
      ID: wrapPromise(`other ${index + start}`),
      Count: wrapPromise(1000 - start - index),
    },
  })),
}

describe('HighTable', () => {
  const mockData = {
    header: ['ID', 'Name', 'Age'],
    numRows: 100,
    rows: vi.fn(({ start, end }: { start: number, end: number }) => Array.from({ length: end - start }, (_, index) => ({
      index: wrapPromise(index + start),
      cells: {
        ID: wrapPromise(index + start),
        Name: wrapPromise(`Name ${index + start}`),
        Age: wrapPromise(20 + index % 50),
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
      expect(mockData.rows).toHaveBeenCalledWith({ start: 0, end: 24 })
    })
  })

  it('uses overscan option', async () => {
    const { getByText } = render(<HighTable data={mockData} overscan={10} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith({ start:0, end:14, orderBy:undefined })
    })
  })

  it('creates the rows after having fetched the data', async () => {
    const { findByRole, queryByRole } = render(<HighTable data={mockData}/>)
    expect(queryByRole('cell', { name: 'Name 0' })).toBeNull()
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'Name 0' })
  })

  it('handles scroll to load more rows', async () => {
    const { container } = render(<HighTable data={mockData} />)
    const scrollDiv = container.querySelector('.table-scroll')
    if (!scrollDiv) throw new Error('Scroll container not found')
    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledTimes(1)
      expect(mockData.rows).toHaveBeenCalledWith({ start:0, end: 24 })
    })

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledWith({ start:0, end: 39 })
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
  function checkRowContents(row: HTMLElement, rowNumber: string, ID: string, Count: string) {
    const selectionCell = within(row).getByRole('rowheader')
    expect(selectionCell).toBeDefined()
    expect(selectionCell.textContent).toBe(rowNumber)

    const columns = within(row).getAllByRole('cell')
    expect(columns).toHaveLength(2)
    expect(columns[0].textContent).toBe(ID)
    expect(columns[1].textContent).toBe(Count)
  }

  it('shows the rows in the right order', async () => {
    const { user, findByRole, getByRole, findAllByRole } = render(<HighTable data={sortableDataFrame(data)} />)

    expect(getByRole('columnheader', { name: 'ID' })).toBeDefined()
    await findByRole('cell', { name: 'row 0' })

    const table = getByRole('grid') // not table! because the table is interactive. See https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role
    // first rowgroup is for the thead second is for tbody
    const tbody = within(table).getAllByRole('rowgroup')[1]
    let rows = within(tbody).getAllByRole('row')
    checkRowContents(rows[0], '1', 'row 0', '1,000')

    // Click on the Count header to sort by Count
    const countHeader = getByRole('columnheader', { name: 'Count' })
    await user.click(countHeader)
    await findAllByRole('cell', { name: 'row 999' })

    rows = within(within(getByRole('grid')).getAllByRole('rowgroup')[1]).getAllByRole('row')
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
    expect(selectedRows[0].getAttribute('aria-rowindex')).toBe(`${other + 2}`)
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

  it('click on a row number cell calls onSelection with the row selected, but changing nothing to the DOM', async () => {
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
    await user.click(rowHeader)

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start, end: start + 1 }], anchor: start })
    expect(queryByRole('row', { selected: true })).toBeNull()
  })

  it('click on a selected row number cell calls unselects the row', async () => {
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

    await user.click(rowHeader)

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

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: start, end: other + 1 }], anchor: start })
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

  it('the table is not marked as multiselectable', () => {
    const selection = { ranges: [] }
    const { getByRole } = render(<HighTable data={data} selection={selection}/>)
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('false')
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
    expect(selectedRows[0].getAttribute('aria-rowindex')).toBe(`${other + 2}`)
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

  it('click on a row number cell does nothing', async () => {
    const selection = { ranges: [] }
    const { user, findByRole, queryByRole } = render(<HighTable data={data} selection={selection}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    await act(async () => {
      if (!rowHeader) {
        throw new Error('rowHeader should be defined')
      }
      await user.click(rowHeader)
    })
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

  it('click on a row number cell calls onSelection with the row selected, and changes the DOM to select the row', async () => {
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
    await user.click(rowHeader)

    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start, end: start + 1 }], anchor: start })
    expect(queryByRole('row', { selected: true })?.getAttribute('aria-rowindex')).toBe(`${start + 2}`)
  })

  it('on data change, onSelection is called with an empty selection and the DOM is updated to unselect the rows', async () => {
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
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [] })
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

  it('click on a row number cell does nothing', async () => {
    const { user, findByRole, queryByRole } = render(<HighTable data={data}/>)
    // await because we have to wait for the data to be fetched first
    const cell = await findByRole('cell', { name: 'row 2' })

    const rowHeader = cell.closest('[role="row"]')?.querySelector('[role="rowheader"]')
    expect(rowHeader).not.toBeNull()
    if (!rowHeader) throw new Error('rowHeader is null')

    await user.click(rowHeader)

    expect(queryByRole('row', { selected: true })).toBeNull()
  })
})
