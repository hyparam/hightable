import { act, fireEvent, render, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sortableDataFrame } from '../src/dataframe.js'
import HighTable from '../src/HighTable.js'

describe('HighTable', () => {
  const mockData = {
    header: ['ID', 'Name', 'Age'],
    numRows: 100,
    rows: vi.fn((start, end) => Promise.resolve(
      Array.from({ length: end - start }, (_, index) => ({
        ID: index + start,
        Name: 'Name ' + (index + start),
        Age: 20 + index % 50,
      }))
    )),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders initial rows', async () => {
    const { getByText } = render(<HighTable data={mockData} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith(0, 24, undefined)
    })
  })

  it('uses overscan option', async () => {
    const { getByText } = render(<HighTable data={mockData} overscan={10} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith(0, 14, undefined)
    })
  })

  it('handles scroll to load more rows', async () => {
    const { container } = render(<HighTable data={mockData} />)
    const scrollDiv = container.querySelector('.table-scroll')
    if (!scrollDiv) throw new Error('Scroll container not found')
    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledTimes(1)
      expect(mockData.rows).toHaveBeenCalledWith(0, 24, undefined)
    })

    act(() => {
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledWith(0, 39, undefined)
    })
  })

  it('correctly handles double click on cell', async () => {
    const mockDoubleClick = vi.fn()
    const { findByText } = render(<HighTable data={mockData} onDoubleClickCell={mockDoubleClick} />)
    const cell = await findByText('Name 0')

    fireEvent.doubleClick(cell)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 1, 0)
  })

  it('correctly handles middle click on cell', async () => {
    const mockMiddleClick = vi.fn()
    const { findByText } = render(<HighTable data={mockData} onMouseDownCell={mockMiddleClick} />)
    const cell = await findByText('Name 0')

    fireEvent.mouseDown(cell, { button: 1 })

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
  const data = {
    header: ['ID', 'Count'],
    numRows: 1000,
    rows: (start: number, end: number) => Promise.resolve(
      Array.from({ length: end - start }, (_, index) => ({
        ID: 'row ' + (index + start),
        Count: 1000 - start - index,
      }))
    ),
  }

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
    const { findByRole, getByRole, findAllByRole } = render(<HighTable data={sortableDataFrame(data)} />)

    expect(getByRole('columnheader', { name: 'ID' })).toBeDefined()
    await findByRole('cell', { name: 'row 0' })

    const table = getByRole('grid') // not table! because the table is interactive. See https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/grid_role
    // first rowgroup is for the thead second is for tbody
    const tbody = within(table).getAllByRole('rowgroup')[1]
    let rows = within(tbody).getAllByRole('row')
    checkRowContents(rows[0], '1', 'row 0', '1,000')

    // Click on the Count header to sort by Count
    const countHeader = getByRole('columnheader', { name: 'Count' })
    fireEvent.click(countHeader)
    await findAllByRole('cell', { name: 'row 999' })

    rows = within(within(getByRole('grid')).getAllByRole('rowgroup')[1]).getAllByRole('row')
    checkRowContents(rows[0], '1,000', 'row 999', '1')
  })

  it('provides the double click callback with the right row index', async () => {
    const mockDoubleClick = vi.fn()
    const { findByRole, getByRole } = render(<HighTable data={sortableDataFrame(data)} onDoubleClickCell={mockDoubleClick} />)
    const cell0 = await findByRole('cell', { name: 'row 0' })

    fireEvent.doubleClick(cell0)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 0, 0)
    vi.clearAllMocks()

    // Click on the Count header to sort by Count
    const countHeader = getByRole('columnheader', { name: 'Count' })
    fireEvent.click(countHeader)

    const cell999 = await findByRole('cell', { name: 'row 999' })

    fireEvent.doubleClick(cell999)

    expect(mockDoubleClick).toHaveBeenCalledWith(expect.anything(), 0, 999)
  })
})

describe('about selection, HighTable', () => {
  const data = {
    header: ['ID', 'Count'],
    numRows: 1000,
    rows: (start: number, end: number) => Promise.resolve(
      Array.from({ length: end - start }, (_, index) => ({
        ID: 'row ' + (index + start),
        Count: 1000 - start - index,
      }))
    ),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('mode 1: controlled - show the selection if passed', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const { container, findByText } = render(<HighTable data={data} selection={selection}/>)
    await findByText('row 2')
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 1}"]`)).toBeNull()
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 2}"]`)).not.toBeNull()
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 3}"]`)).toBeNull()
  })

  it('mode 1: controlled - onSelection is not called on data change', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { container, findByText, rerender } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 2}"]`)).not.toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const newData = { ...data, numRows: 2000 }
    rerender(<HighTable data={newData} selection={selection} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(onSelectionChange).not.toHaveBeenCalled()
  })

  it('mode 1: controlled - click on a row number cell selects it, calling onSelection', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { container, findByText } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 2}"]`)).not.toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const other = 5
    const anotherCell = container.querySelector(`tr[aria-rowindex="${other + 2}"] th`)
    await act(async () => {
      anotherCell && await userEvent.click(anotherCell)
    })
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: start, end: start + 1 }, { start: other, end: other + 1 }], anchor: other })
  })

  it('mode 1: controlled - click on a selected row number cell unselects it, calling onSelection', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { container, findByText } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 2}"]`)).not.toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
    // ^ TODO(SL): we don't want that AT ALL
    onSelectionChange.mockClear()

    const sameCell = container.querySelector(`tr[aria-rowindex="${start + 2}"] th`)
    await act(async () => {
      sameCell && await userEvent.click(sameCell)
    })
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [], anchor: start })
  })

  it('mode 1: controlled - onSelection is called with updated selection on shift+click', async () => {
    const start = 2
    const selection = { ranges: [{ start, end: start + 1 }], anchor: start }
    const onSelectionChange = vi.fn()
    const { container, findByText } = render(<HighTable data={data} selection={selection} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(container.querySelector(`tr[aria-selected="true"][aria-rowindex="${start + 2}"]`)).not.toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
    // ^ TODO(SL): we don't want that AT ALL
    onSelectionChange.mockClear()

    const other = 5
    const anotherCell = container.querySelector(`tr[aria-rowindex="${other + 2}"] th`)
    await act(async () => {
      // see https://testing-library.com/docs/user-event/setup/#starting-a-session-per-setup
      const user = userEvent.setup()
      await user.keyboard('[ShiftLeft>]') // Press Shift (without releasing it)
      anotherCell && await user.click(anotherCell) // Perform a click with `shiftKey: true`
    })
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: start, end: other + 1 }], anchor: start })
  })

  // mode 2: controlled read-only - show the selection if passed + onSelectionChange is not called

  it('mode 3: uncontrolled - onSelection is called on data change', async () => {
    const start = 2
    const onSelectionChange = vi.fn()
    const { container, findByText, rerender } = render(<HighTable data={data} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()

    const newData = { ...data, numRows: 2000 }
    rerender(<HighTable data={newData} onSelectionChange={onSelectionChange}/>)
    await findByText('row 2')
    expect(onSelectionChange).toHaveBeenCalled()
  })

  it('mode 3: uncontrolled - onSelection is called on user interaction', async () => {
    const onSelectionChange = vi.fn()
    const { container, findByText } = render(<HighTable data={data} onSelectionChange={onSelectionChange} />)
    await findByText('row 2')
    expect(container.querySelector('tr[aria-selected="true"]')).toBeNull()
    expect(onSelectionChange).not.toHaveBeenCalled()
    onSelectionChange.mockClear()
    const start = 5
    const anotherCell = container.querySelector(`tr[aria-rowindex="${start + 2}"] th`)
    await act(async () => {
      anotherCell && await userEvent.click(anotherCell)
    })
    expect(onSelectionChange).toHaveBeenCalledWith({ ranges: [{ start: start, end: start + 1 }], anchor: start })
  })


  // it('cannot select a row if selection and onSelectionChange are not passed', async () => {
  // })


})
