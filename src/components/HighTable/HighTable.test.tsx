import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest'

import { createGetRowNumber, validateFetchParams, validateGetCellParams, validateGetRowNumberParams } from '../../helpers/dataframe/helpers.js'
import { arrayDataFrame, DataFrame, DataFrameEvents, Fetch } from '../../helpers/dataframe/index.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import type { Obj } from '../../helpers/dataframe/types.js'
import type { OrderBy } from '../../helpers/sort.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import { render } from '../../utils/userEvent.js'
import HighTable from './HighTable.js'

Element.prototype.scrollIntoView = vi.fn()

export const dataColumnDescriptors = ['ID', 'Count', 'Double', 'Triple'].map(name => ({
  name,
  metadata: { type: 'test' }, // This metadata has no purpose other than testing the types
}))
export function createData(): DataFrame<Obj, { type: string }> {
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

export function createOtherData(): DataFrame<{ description: string }> {
  const metadata = { description: 'dataframe metadata' } // This metadata has no purpose other than testing the types
  const columnDescriptors = ['ID', 'Count'].map(name => ({ name, metadata: { somekey: 'OK' } }))
  const numRows = 1000
  const getRowNumber = createGetRowNumber({ numRows: 1000 })
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }) {
    validateGetCellParams({ column, row, orderBy, data: { numRows, columnDescriptors } })
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
    validateGetCellParams({ column, row, orderBy, data: { numRows, columnDescriptors } })
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

describe('HighTable', () => {
  let mockData: MockedUnsortableDataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    mockData = createMockData()
  })

  it('renders initial rows', async () => {
    const { getByText } = render(<HighTable data={mockData} />)
    await waitFor(() => {
      getByText('ID')
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 0, column: 'ID', orderBy: [] })
      expect(mockData.getCell).toHaveBeenCalledWith({ row: 23, column: 'Age', orderBy: [] })
      expect(mockData.getCell).not.toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
  })

  it('uses padding option', async () => {
    const { getByText } = render(<HighTable data={mockData} padding={10} />)
    await waitFor(() => {
      getByText('ID')
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
      validateGetCellParams({ column, row, orderBy, data: { numRows, columnDescriptors } })
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
      validateGetRowNumberParams({ row, orderBy, data: { numRows, columnDescriptors } })
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders initial rows', async () => {
    const defaultPadding = 20
    const rowEnd = defaultPadding + 4
    const asyncData = createAsyncDataFrame()
    const { getByText } = render(<HighTable data={asyncData} />)
    await waitFor(() => {
      getByText('ID')
      expect(asyncData.fetch).toHaveBeenCalledExactlyOnceWith({ rowStart: 0, rowEnd, columns: ['ID', 'Name', 'Age'], orderBy: [], signal: expect.any(AbortSignal) })
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 0, column: 'ID', orderBy: [] })
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: rowEnd - 1, column: 'Age', orderBy: [] })
      expect(asyncData.getCell).not.toHaveBeenCalledWith({ row: rowEnd, column: 'Age', orderBy: [] })
    })
  })

  it('uses padding option', async () => {
    const padding = 10
    const rowEnd = padding + 4
    const asyncData = createAsyncDataFrame()
    const { getByText } = render(<HighTable data={asyncData} padding={padding} />)
    await waitFor(() => {
      getByText('ID')
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
    await findByRole('cell', { name: 'async 0' })
  })

  it('handles scroll to load more rows', async () => {
    const asyncData = createAsyncDataFrame()
    const { getByLabelText, findByRole, queryByRole } = render(<HighTable className="myclass" data={asyncData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 23, column: 'Age', orderBy: [] })
      expect(asyncData.getCell).not.toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
    await findByRole('cell', { name: 'async 0' })
    expect(queryByRole('cell', { name: 'async 24' })).toBeNull()

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 24, column: 'Age', orderBy: [] })
    })
    await findByRole('cell', { name: 'async 24' })
    expect(queryByRole('cell', { name: 'async 50' })).toBeNull()

    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 1500 } })
    })
    await waitFor(() => {
      expect(asyncData.getCell).toHaveBeenCalledWith({ row: 50, column: 'Age', orderBy: [] })
    })
    await findByRole('cell', { name: 'async 50' })

    expect(asyncData._forTests.signalAborted).toHaveLength(0) // the fetches are too fast to be cancelled (10ms)
  })

  it('aborts data fetch when scrolling fast', async () => {
    // Use fake timers to make the test deterministic and fast
    vi.useFakeTimers()

    const ms = 100
    const asyncData = createAsyncDataFrame({ ms })
    const { getByLabelText, queryByRole } = render(<HighTable className="myclass" data={asyncData} />)
    const scrollDiv = getByLabelText('Virtual-scroll table')
    const idx1 = 0
    const idx2 = 24
    const idx3 = 50

    // Wait for initial fetch to complete by advancing timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })

    // Check that first cell is rendered
    expect(queryByRole('cell', { name: `async ${idx1}` })).not.toBeNull()
    expect(queryByRole('cell', { name: `async ${idx2}` })).toBeNull()
    expect(asyncData._forTests.signalAborted).toHaveLength(0)
    expect(asyncData._forTests.asyncDataFetched[idx1]).toBe(true) // fetched
    expect(asyncData._forTests.asyncDataFetched[idx2]).toBe(false) // not fetched
    expect(asyncData._forTests.asyncDataFetched[idx3]).toBe(false) // not fetched

    // Scroll to trigger second fetch
    act(() => {
      // not using userEvent because it doesn't support scroll events
      // https://github.com/testing-library/user-event/issues/475
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    // Verify scroll triggered the getCell call for idx2
    expect(asyncData.getCell).toHaveBeenCalledWith({ row: idx2, column: 'Age', orderBy: [] })

    // nothing occurred yet, because the fetch is still pending
    expect(asyncData._forTests.signalAborted).toHaveLength(0)
    expect(asyncData._forTests.asyncDataFetched[idx1]).toBe(true) // fetched
    expect(asyncData._forTests.asyncDataFetched[idx2]).toBe(false) // not fetched
    expect(asyncData._forTests.asyncDataFetched[idx3]).toBe(false) // not fetched

    // Advance time by half to simulate being in the middle of the fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms / 2)
    })

    // Scroll again before the second fetch completes (should abort the previous fetch)
    act(() => {
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 1500 } })
    })

    // Verify scroll triggered the getCell call for idx3
    expect(asyncData.getCell).toHaveBeenCalledWith({ row: idx3, column: 'Age', orderBy: [] })

    // Complete the remaining time for the third fetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })

    // Check that row "idx3" has been fetched and rendered
    expect(queryByRole('cell', { name: `async ${idx3}` })).not.toBeNull()

    // One fetch should have been aborted, because we scrolled again before the second fetch was done
    expect(asyncData._forTests.signalAborted).toHaveLength(1)
    expect(asyncData._forTests.asyncDataFetched[idx1]).toBe(true) // fetched
    expect(asyncData._forTests.asyncDataFetched[idx2]).toBe(false) // not fetched (aborted)
    expect(asyncData._forTests.asyncDataFetched[idx3]).toBe(true) // fetched
  })
})

describe('When sorted, HighTable', () => {
  let data: DataFrame
  beforeEach(() => {
    vi.clearAllMocks()
    data = createData()
  })

  function checkRowContents(row: HTMLElement | undefined, rowNumber: string, ID: string, Count: string) {
    if (!row) {
      throw new Error('Row is undefined')
    }

    const selectionCell = within(row).getByRole('rowheader')
    expect(selectionCell.textContent).toBe(rowNumber)

    const columns = within(row).getAllByRole('cell')
    expect(columns).toHaveLength(4)
    expect(columns[0]?.textContent).toBe(ID)
    expect(columns[1]?.textContent).toBe(Count)
  }

  it('shows the rows in the right order', async () => {
    const { user, findByRole, getByRole, findAllByRole } = render(<HighTable data={sortableDataFrame(data)} />)

    getByRole('columnheader', { name: 'ID' })
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

const initialWidth = 62 // initial width of the columns, in pixels, above the default minimal width of 50px
const getOffsetWidth = vi.fn(() => initialWidth)
const getClientWidth = vi.fn(() => 1000) // used to get the width of the table - let's give space
const columnWidthsSuffix = ':2:column:widths'
const keyItem = `key${columnWidthsSuffix}`
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

  it('does not save anything in localstorage if no fixed widths', () => {
    localStorage.clear()
    render(<HighTable data={data} cacheKey="key" />)
    expect(getClientWidth).toHaveBeenCalled()
    const json = localStorage.getItem(keyItem)
    expect(json).toEqual(null)
  })
  it('is used to load previously saved column widths', () => {
    localStorage.clear()
    const savedWidth = initialWidth * 2
    const json = JSON.stringify(Array(4).fill(savedWidth))
    localStorage.setItem(keyItem, json)

    const { getAllByRole } = render(<HighTable data={data} cacheKey="key" />)
    const header = getAllByRole('columnheader')[0]
    if (!header) {
      throw new Error('Header should not be null')
    }
    expect(localStorage.getItem(keyItem)).toEqual(json)
    expect(header.style.maxWidth).toEqual(`${savedWidth}px`)
  })
  it('the previous data is used or updated if new data are loaded', () => {
    localStorage.clear()
    const savedWidth = initialWidth * 2
    const json = JSON.stringify(Array(4).fill(savedWidth))
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

describe('When the number of rows is updated', () => {
  it('shows the updated row count', async () => {
    const array: Record<string, any>[] = [
      { ID: 'row 0', Value: 10 },
    ]
    const data = arrayDataFrame(array)

    const { findByRole, getByRole, getAllByRole } = render(
      <HighTable data={data} />
    )
    // await because we have to wait for the data to be fetched first
    await findByRole('cell', { name: 'row 0' })
    expect(getAllByRole('row')).toHaveLength(2) // +1 for the header row
    expect(getByRole('grid').getAttribute('aria-rowcount')).toBe('2')

    // await is required, the sync version does not work
    // eslint-disable-next-line require-await, @typescript-eslint/require-await
    await act(async () => {
      data._array.push({ ID: 'row 1', Value: 20 })
    })

    await waitFor(() => {
      expect(getAllByRole('row')).toHaveLength(3) // +1 for the header row
      expect(getByRole('grid').getAttribute('aria-rowcount')).toBe('3')
    })
  })
})
