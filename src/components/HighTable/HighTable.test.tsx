import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { UserEvent } from '@testing-library/user-event'
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGetRowNumber, validateColumn, validateFetchParams, validateRow } from '../../helpers/dataframe/helpers.js'
import { DataFrame, DataFrameEvents, Fetch, filterDataFrame } from '../../helpers/dataframe/index.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import { OrderBy, validateOrderBy } from '../../helpers/sort.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import { MaybeColumnWidth } from '../../helpers/width.js'
import { render } from '../../utils/userEvent.js'
import HighTable, { columnWidthsSuffix, defaultOverscan } from './HighTable.js'
import type { Obj } from '../../helpers/dataframe/types.js'

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
    validateColumn({ column, data: { columnDescriptors } })
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
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

function createOtherData(): DataFrame<{ description: string }> {
  const metadata = { description: 'dataframe metadata' } // This metadata has no purpose other than testing the types
  const columnDescriptors = ['ID', 'Count'].map(name => ({ name, metadata: { somekey: 'OK' } }))
  const numRows = 1000
  const getRowNumber = createGetRowNumber({ numRows: 1000 })
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) {
    validateColumn({ column, data: { columnDescriptors } })
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
    if (column === 'ID') {
      return { value: `other ${row}` }
    } else if (column === 'Count') {
      return { value: 1000 - row }
    }
  }
  return { metadata, columnDescriptors, numRows, getCell, getRowNumber }
}

interface MockedUnsortableDataFrame extends DataFrame {
  fetch: Mock<Fetch>
  getCell: Mock<DataFrame['getCell']>
}
function createMockData(): MockedUnsortableDataFrame {
  const numRows = 100
  const columnDescriptors = ['ID', 'Name', 'Age'].map(name => ({ name }))
  const getCell = vi.fn(({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) => {
    validateColumn({ column, data: { columnDescriptors } })
    validateRow({ row, data: { numRows } })
    validateOrderBy({ orderBy })
    if (row < 0 || row >= 1000) {
      throw new Error(`Invalid row index: ${row}`)
    }
    if (column === 'ID') {
      return { value: row }
    } else if (column === 'Name') {
      return { value: `Name ${row}` }
    } else if (column === 'Age') {
      return { value: 20 + row % 50 }
    }
    throw new Error(`Unknown column: ${column}`)
  })
  const getRowNumber = createGetRowNumber({ numRows })
  return {
    columnDescriptors,
    numRows,
    getCell,
    getRowNumber,
    fetch: vi.fn(() => Promise.resolve()),
  }
}

async function setFocusOnScrollableDiv(user: UserEvent) {
  await user.keyboard('{Shift>}{Tab}{/Shift}')
}
async function setFocusOnCellCol3Row3(user: UserEvent) {
  await user.keyboard('{Right}{Right}{Down}{Down}')
}

describe('HighTable', () => {
  let mockData: MockedUnsortableDataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    mockData = createMockData()
  })

  it('renders initial rows', async () => {
    const { getByText } = render(<HighTable data={mockData} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 0, column: 'ID', orderBy: [] })
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 23, column: 'Age', orderBy: [] })
      expect(mockData.getCell).not.toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
  })

  it('uses overscan option', async () => {
    const { getByText } = render(<HighTable data={mockData} overscan={10} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 13, column: 'Age', orderBy: [] })
      expect(mockData.getCell).not.toHaveBeenCalledWith({ row: 14, column: 'Age', orderBy: [] })
    })
  })

  it('creates the rows after having fetched the data', () => {
    const { queryByRole } = render(<HighTable data={mockData}/>)
    expect(queryByRole('cell', { name: 'Name 0' })).not.toBeNull()
  })

  it('handles scroll to load more rows', async () => {
    const { getByLabelText } = render(<HighTable className="myclass" data={mockData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    await waitFor(() => {
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 23, column: 'Age', orderBy: [] })
      expect(mockData.getCell).not.toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
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

  it('throws error when data fetch fails', async () => {
    const mockOnError = vi.fn()
    mockData.fetch.mockImplementationOnce(() => Promise.reject(new Error('Failed to fetch data')))
    const { container } = render(<HighTable data={mockData} onError={mockOnError} />)

    await waitFor(() => {
      expect(mockData.getCell).toHaveBeenCalled()
      expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
    })
    // Clear pending state on error (TODO: restore the pending state and show it in the UI):
    expect(container.querySelector('div.pending')).toBeNull()
  })
})

describe('with async data, HighTable', () => {
  function createAsyncDataFrame({ ms }: {ms: number} = { ms: 10 }): DataFrame & {_forTests: {signalAborted: boolean[], asyncDataFetched: boolean[]}} {
    const asyncDataFetched = Array<boolean>(1000).fill(false)
    const signalAborted: boolean[] = []
    const eventTarget = createEventTarget<DataFrameEvents>()
    const numRows = 1000
    const columnDescriptors = ['ID', 'Name', 'Age'].map(name => ({ name }))
    function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) {
      validateRow({ row, data: { numRows } })
      validateColumn({ column, data: { columnDescriptors } })
      validateOrderBy({ orderBy })
      if (!asyncDataFetched[row]) {
        return undefined
      }
      if (column === 'ID') {
        return { value: `async ${row}` }
      } else if (column === 'Name') {
        return { value: `Async Name ${row}` }
      } else if (column === 'Age') {
        return { value: 20 + row % 50 }
      }
    }
    function getRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }) {
      validateRow({ row, data: { numRows } })
      validateOrderBy({ orderBy })
      if (!asyncDataFetched[row]) {
        return undefined
      }
      return { value: row }
    }

    return {
      columnDescriptors,
      numRows,
      getRowNumber,
      getCell: vi.fn(getCell),
      fetch: vi.fn(async ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => {
        // Validation
        validateFetchParams({ rowStart, rowEnd, columns, orderBy, data: { numRows, columnDescriptors } })
        await new Promise(resolve => setTimeout(resolve, ms))
        if (signal?.aborted) {
          signalAborted.push(true)
          return Promise.reject(new DOMException('Fetch aborted', 'AbortError'))
        }
        for (let row = rowStart; row < rowEnd; row++) {
          asyncDataFetched[row] = true
        }

        for (let row = rowStart; row < rowEnd; row++) {
          if (getRowNumber({ row }) === undefined) {
            throw new Error(`Row number not found for row ${row}, and this is a static data frame.`)
          }
          for (const column of columns ?? []) {
            if (getCell({ row, column }) === undefined) {
              throw new Error(`Cell not found for row ${row} and column "${column}", and this is a static data frame.`)
            }
          }
        }

        eventTarget.dispatchEvent(new CustomEvent('resolve'))
      }),
      eventTarget,
      _forTests: {
        signalAborted,
        asyncDataFetched,
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial rows', async () => {
    const rowEnd = defaultOverscan + 4
    const asyncData = createAsyncDataFrame()
    const { getByText } = render(<HighTable data={asyncData} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(asyncData.fetch).toHaveBeenCalledExactlyOnceWith({ rowStart: 0, rowEnd, columns: ['ID', 'Name', 'Age'], orderBy: [], signal: expect.any(AbortSignal) })
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 0, column: 'ID', orderBy: [] })
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: rowEnd - 1, column: 'Age', orderBy: [] })
      expect(asyncData.getCell).not.toHaveBeenCalledWith({ row: rowEnd, column: 'Age', orderBy: [] })
    })
  })

  it('uses overscan option', async () => {
    const overscan = 10
    const rowEnd = overscan + 4
    const asyncData = createAsyncDataFrame()
    const { getByText } = render(<HighTable data={asyncData} overscan={overscan} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(asyncData.fetch).toHaveBeenCalledExactlyOnceWith({ rowStart: 0, rowEnd, columns: ['ID', 'Name', 'Age'], orderBy: [], signal: expect.any(AbortSignal) })
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: rowEnd - 1, column: 'Age', orderBy: [] })
      expect(asyncData.getCell).not.toHaveBeenCalledWith({ row: rowEnd, column: 'Age', orderBy: [] })
    })
  })

  it('creates the rows after having fetched the data', async () => {
    const asyncData = createAsyncDataFrame()
    const { queryByRole, findByRole } = render(<HighTable data={asyncData}/>)
    // initially, the cell is not there because the data is not fetched yet
    expect(queryByRole('cell', { name: 'async 0' })).toBeNull()
    // after some delay, the cell should be there
    await expect(findByRole('cell', { name: 'async 0' })).resolves.toBeDefined()
  })

  it('handles scroll to load more rows', async () => {
    const asyncData = createAsyncDataFrame()
    const { getByLabelText, findByRole, queryByRole } = render(<HighTable className="myclass" data={asyncData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 23, column: 'Age', orderBy: [] })
      expect(asyncData.getCell).not.toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
    await expect(findByRole('cell', { name: 'async 0' })).resolves.toBeDefined()
    expect(queryByRole('cell', { name: 'async 24' })).toBeNull()

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
    await expect(findByRole('cell', { name: 'async 24' })).resolves.toBeDefined()
    expect(queryByRole('cell', { name: 'async 50' })).toBeNull()

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 1500 } })
    })
    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 50, column: 'Age', orderBy: [] })
    })
    await expect(findByRole('cell', { name: 'async 50' })).resolves.toBeDefined()

    expect(asyncData._forTests.signalAborted).toHaveLength(0) // the fetches are too fast to be cancelled (10ms)
  })

  it('aborts data fetch when scrolling fast', async () => {
    const ms = 500
    const asyncData = createAsyncDataFrame({ ms })
    const { getByLabelText, findByRole, queryByRole } = render(<HighTable className="myclass" data={asyncData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    await expect(findByRole('cell', { name: 'async 0' })).resolves.toBeDefined()
    expect(queryByRole('cell', { name: 'async 24' })).toBeNull()
    expect(asyncData._forTests.signalAborted).toHaveLength(0)

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    // scroll again before the first fetch is done
    void new Promise(resolve => setTimeout(resolve, ms / 5))
    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 1500 } })
    })
    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 50, column: 'Age', orderBy: [] })
    })
    await expect(findByRole('cell', { name: 'async 50' })).resolves.toBeDefined()

    expect(asyncData._forTests.signalAborted).toHaveLength(1) // one fetch should have been aborted, because we scrolled again before the first fetch was done
    expect(asyncData._forTests.asyncDataFetched[24]).toBe(false) // the fetch for row 24 should have been cancelled
  })
})

describe('When sorted, HighTable', () => {
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
  })

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
  let data: DataFrame
  let otherData: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
    otherData = createOtherData()
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

  it('the table is marked as multiselectable', async () => {
    const selection = { ranges: [] }
    const onSelectionChange = vi.fn()
    const { getByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('HighTable shows the new selection if updated, and onSelectionChange is not called', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { getAllByRole, findByRole, rerender, getByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const other = 5
    const newSelection = { ranges: [{ start: other, end: other + 1 }], anchor: other }
    rerender(<HighTable data={data} selection={newSelection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
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

    const { getByRole, queryByRole, findByRole, rerender } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })
    expect(console.warn).not.toHaveBeenCalled()

    const newSelection = undefined
    rerender(<HighTable data={data} selection={newSelection} onSelectionChange={onSelectionChange}/>)
    // no need to await because the data is already fetched
    expect(queryByRole('row', { selected: true })).not.toBeNull()
    expect(console.warn).toHaveBeenNthCalledWith(1, expect.stringMatching(/cannot be set to undefined/))
  })

  it('on data change, onSelection is not called and the selection stays the same', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { rerender, findByRole, getByRole, queryByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
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
    const { user, findByRole, getByRole, queryByRole } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
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
  let data: DataFrame
  let otherData: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
    otherData = createOtherData()
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

  it('the table is marked as multiselectable', async () => {
    const selection = { ranges: [] }
    const { getByRole } = render(<HighTable data={data} selection={selection}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
    const table = getByRole('grid')
    expect(table.getAttribute('aria-multiselectable')).toBe('true')
  })

  it('HighTable shows the new selection if updated', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const { getAllByRole, findByRole, rerender, getByRole } = render(<HighTable data={data} selection={selection}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
    // await because we have to wait for the data to be fetched first
    await findByRole('row', { selected: true })

    const other = 5
    const newSelection = { ranges: [{ start: other, end: other + 1 }], anchor: other }
    rerender(<HighTable data={data} selection={newSelection}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
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
  let data: DataFrame
  let otherData: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
    otherData = createOtherData()
  })

  it('HighTable shows no selection initially and onSelectionChange is not called', async () => {
    const onSelectionChange = vi.fn()
    const { findByRole, queryByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 2' })
    expect(queryByRole('row', { selected: true })).toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('the table is marked as multiselectable', async () => {
    const onSelectionChange = vi.fn()
    const { getByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    await waitFor(() => {
      expect(getByRole('grid').getAttribute('aria-busy')).toBe('false')
    })
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
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
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
const keyItem = `key${columnWidthsSuffix}`
const undefinedItem = `undefined${columnWidthsSuffix}`
vi.mock(import('../../helpers/width.js'), async (importOriginal ) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getOffsetWidth: () => getOffsetWidth(),
    getClientWidth: () => getClientWidth(),
  }})
describe('HighTable localstorage', () => {
  let data: DataFrame
  let otherData: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
    otherData = createOtherData()
  })

  it('only saves the fixed widths', () => {
    localStorage.clear()
    render(<HighTable data={data} cacheKey="key" />)
    expect(getClientWidth).toHaveBeenCalled()
    const json = localStorage.getItem(keyItem)
    expect(json).not.toEqual(null)
    const columnWidths = JSON.parse(json ?? '[]') as MaybeColumnWidth[] // TODO: we could check the type of the column widths
    expect(columnWidths).toHaveLength(4) // 4 columns
    columnWidths.forEach((columnWidth) => {
      expect(columnWidth?.measured).toBeUndefined() // the measured field is not stored
      expect(columnWidth?.width).toBeUndefined() // no columns is fixed
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
    const columnWidths = JSON.parse(json ?? '[]') as MaybeColumnWidth[]
    expect(columnWidths).toHaveLength(4) // 4 columns
    columnWidths.forEach((columnWidth) => {
      expect(columnWidth?.measured).toBeUndefined() // the measured field is not stored
      expect(columnWidth?.width).toBeDefined() // all columns should have been adjusted to some width
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
    expect(localStorage.getItem(`${otherKey}${columnWidthsSuffix}`)).not.toEqual(localStorage.getItem(keyItem))
    expect(header.style.maxWidth).not.toEqual(`${savedWidth}px`)
  })
})

describe('Navigating Hightable with the keyboard', () => {
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
      await user.keyboard('{ArrowRight}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 10).toString())
      await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value - 20).toString())
      await user.keyboard('{ArrowUp}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value - 10).toString())
      await user.keyboard('{ArrowDown}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value - 20).toString())
      await user.keyboard('{PageUp}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value + 80).toString())
      await user.keyboard('{PageDown}')
      expect(spinbutton.getAttribute('aria-valuenow')).toBe((+value - 20).toString())
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
      expect(+valueNow).toBeLessThan(+value)
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
      const initialValue = spinbutton.getAttribute('aria-valuenow')
      // autoresize
      await user.keyboard(key)
      expect(spinbutton.getAttribute('aria-valuenow')).not.toBe(initialValue)
      // focus the resizer again
      await user.keyboard('{Tab}{Tab}')
      // press the key
      await user.keyboard(key)
      // already autosized - toggles to adjustable width
      expect(spinbutton.getAttribute('aria-valuenow')).toBe(initialValue)
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

// TODO(SL): restore when we handle errors better
// describe('When the number of rows is updated', () => {
//   it('an error is raised', async () => {
//     const smallData = {
//       ...data,
//       numRows: 5,
//     }

//     class ErrorBoundary extends Component<{ children: ReactNode }, { lastError: unknown }>{
//       constructor(props: { children: ReactNode }) {
//         super(props)
//         this.state = { lastError: undefined }
//       }

//       static getDerivedStateFromError(error: unknown) {
//         // Update state so the next render will show the fallback UI.
//         return { lastError: error }
//       }

//       componentDidCatch() {
//         // Stop the error propagation
//       }

//       render() {
//         if (this.state.lastError) {
//           // You can render any custom fallback UI
//           return <div role="alert">Something went wrong</div>
//         }

//         return this.props.children
//       }
//     }

//     const { findByRole, getByRole, getAllByRole, rerender } = render(
//       <ErrorBoundary>
//         <HighTable data={smallData} />
//       </ErrorBoundary>
//     )
//     // await because we have to wait for the data to be fetched first
//     await findByRole('cell', { name: 'row 2' })
//     expect(getAllByRole('row')).toHaveLength(6) // +1 for the header row
//     expect(getByRole('grid').getAttribute('aria-rowcount')).toBe('6')

//     smallData.numRows = 10

//     rerender(
//       <ErrorBoundary>
//         <HighTable data={smallData} />
//       </ErrorBoundary>
//     )

//     expect(getByRole('alert'), 'Something went wrong').toBeDefined()
//   })
// })

describe('When data is a twice-sampled dataframe', () => {
  function createSampledData() {
    return sortableDataFrame(filterDataFrame({
      data: sortableDataFrame(filterDataFrame({
        data: createData(),
        filter: ({ row }) => row % 2 === 0, // keep only even rows
      })),
      filter: ({ row }) => row % 3 === 0, // keep only rows that are multiples of 3
    }))
    // the rows are: 0, 6, 12, 18, 24, ...
  }
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createSampledData()
  })
  it('the table is rendered with the correct row numbers and contents', async () => {
    const { findByRole, getAllByRole } = render(<HighTable data={data} />)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 0' })
    const rows = getAllByRole('row')
    const rowHeaders = getAllByRole('rowheader')
    // header row
    expect(rows[0]?.getAttribute('aria-rowindex')).toBe('1')
    expect(rows[0]?.getAttribute('data-rownumber')).toBeNull()
    // first data row
    expect(rows[1]?.getAttribute('aria-rowindex')).toBe('2')
    expect(rows[1]?.getAttribute('data-rownumber')).toBe('0')
    expect(rows[1]?.textContent).toContain('row 0')
    expect(rows[1]?.textContent).toContain('1,000')
    expect(rowHeaders[0]?.textContent).toBe('1') // row numbers are formatted as 1-based index
    // second data row
    expect(rows[2]?.getAttribute('aria-rowindex')).toBe('3')
    expect(rows[2]?.getAttribute('data-rownumber')).toBe('6')
    expect(rows[2]?.textContent).toContain('row 6')
    expect(rows[2]?.textContent).toContain('994')
    expect(rowHeaders[1]?.textContent).toBe('7')
  })
  it('the sorted table is rendered with the correct row numbers and contents', async () => {
    const { findByRole, getAllByRole } = render(<HighTable data={data} orderBy={[{ column: 'Count', direction: 'ascending' }]} />)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 996' })
    const rows = getAllByRole('row')
    const rowHeaders = getAllByRole('rowheader')
    // header row
    expect(rows[0]?.getAttribute('aria-rowindex')).toBe('1')
    expect(rows[0]?.getAttribute('data-rownumber')).toBeNull()
    // first data row
    expect(rows[1]?.getAttribute('aria-rowindex')).toBe('2')
    expect(rows[1]?.getAttribute('data-rownumber')).toBe('996')
    expect(rows[1]?.textContent).toContain('row 996')
    expect(rows[1]?.textContent).toContain('4')
    expect(rowHeaders[0]?.textContent).toBe('997') // row numbers are formatted as 1-based index
    // second data row
    expect(rows[2]?.getAttribute('aria-rowindex')).toBe('3')
    expect(rows[2]?.getAttribute('data-rownumber')).toBe('990')
    expect(rows[2]?.textContent).toContain('row 990')
    expect(rows[2]?.textContent).toContain('10')
    expect(rowHeaders[1]?.textContent).toBe('991')
  })
  it('the table extends the selection when Shift+Clicking on a row number cell', async () => {
    const onSelectionChange = vi.fn()
    const { user } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // move the focus two rows down and select the second row
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard(' ')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 6, end: 7 }], anchor: 6 })
    onSelectionChange.mockClear()
    // move the focus two rows down and shift+select
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 6, end: 7 }, { start: 12, end: 13 }, { start: 18, end: 19 } ], anchor: 18 })
    onSelectionChange.mockClear()
    // move the focus one row down and shift+select
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 6, end: 7 }, { start: 12, end: 13 }, { start: 18, end: 19 }, { start: 24, end: 25 } ], anchor: 24 })
    onSelectionChange.mockClear()
    // shift+select
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 6, end: 7 }, { start: 12, end: 13 }, { start: 18, end: 19 } ], anchor: 24 })

  })
  it('the sorted table extends the selection when Shift+Clicking on a row number cell', async () => {
    const onSelectionChange = vi.fn()
    const { user } = render(<HighTable data={data} orderBy={[{ column: 'Count', direction: 'ascending' }]} onSelectionChange={onSelectionChange}/>)
    // scroll down and select the row
    await user.keyboard('{PageDown}')
    await user.keyboard(' ')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 882, end: 883 }], anchor: 882 })
    onSelectionChange.mockClear()
    // move the focus two rows down and shift+select
    await user.keyboard('{ArrowDown}{ArrowDown}')
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 870, end: 871 }, { start: 876, end: 877 }, { start: 882, end: 883 } ], anchor: 870 })
    onSelectionChange.mockClear()
    // move the focus one row down and shift+select
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 864, end: 865 }, { start: 870, end: 871 }, { start: 876, end: 877 }, { start: 882, end: 883 } ], anchor: 864 })
    onSelectionChange.mockClear()
    // shift+select
    await user.keyboard('{Shift>} {/Shift}')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: 870, end: 871 }, { start: 876, end: 877 }, { start: 882, end: 883 } ], anchor: 864 })
  })
  it('toggling all the rows selects all the sampled rows', async () => {
    const onSelectionChange = vi.fn()
    const { user, queryAllByRole, findByRole } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 0' })

    // no selected rows
    expect(queryAllByRole('row', { selected: true })).toHaveLength(0)
    // the focus is on the table corner, let's press it to toggle all the rows
    await user.keyboard(' ')

    // all the sampled rows are selected
    const expectedRanges = Array.from({ length: data.numRows }, (_, row) => {
      const rowNumber = data.getRowNumber({ row })?.value
      if (rowNumber === undefined) {
        // should never happen
        throw new Error(`Row number is undefined for row ${row}`)
      }
      return { start: rowNumber, end: rowNumber + 1 }
    }).sort((a, b) => a.start - b.start) // sort just in case (no need to merge the ranges with that example data)
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: expectedRanges })
    onSelectionChange.mockClear()
    expect(queryAllByRole('row', { selected: true }).length).toBeGreaterThan(2)

    // toggle again
    await user.keyboard(' ')
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [] })
    onSelectionChange.mockClear()
    expect(queryAllByRole('row', { selected: true })).toHaveLength(0)
  })
})
