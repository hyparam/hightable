import { act, render, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useReducer } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ControlledHighTable from '../src/ControlledHighTable.js'
import { initialState, reducer } from '../src/HighTable.js'

const data = {
  header: ['Name', 'Age'],
  numRows: 100,
  rows: (start: number, end: number) => Promise.resolve(
    Array.from({ length: end - start }, (_, index) => ({
      Name: 'Name ' + (index + start),
      Age: 20 + index % 50,
    }))
  ),
}
const sortableData = {
  ...data,
  sortable: true,
}

describe('ControlledHighTable', () => {
  const getData = vi.fn((sortable) => sortable ? sortableData : data)

  const appReducer = vi.fn(reducer)
  function App({ sortable, selectable }: { sortable?: boolean, selectable?: boolean } = {}) {
    const [state, dispatch] = useReducer(appReducer, initialState)

    return <ControlledHighTable data={getData(sortable)} state={state} dispatch={dispatch} selectable={selectable} />
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dispatches several times when initializing', async () => {
    const { getByText } = render(<App />)
    await waitFor(() => {
      expect(getByText('Name 20')).toBeDefined()
    })
    // TODO(SL): not sure if we're interested in such details
    expect(appReducer).toHaveBeenNthCalledWith(1, expect.anything(), expect.objectContaining({ type: 'SET_COLUMN_WIDTHS' }))
    expect(appReducer).toHaveBeenNthCalledWith(2, expect.anything(), { type: 'DATA_CHANGED' })
    expect(appReducer).toHaveBeenNthCalledWith(3, expect.anything(), expect.objectContaining({ type: 'SET_ROWS' }))
    expect(appReducer).toHaveBeenNthCalledWith(4, expect.anything(), expect.objectContaining({ type: 'SET_ROWS' }))
  })

  it.each([undefined, false, true])('dispatch SET_ORDER when clicking on header if data.sortable is true - test with sortable=%s', async (sortable) => {
    const { getByText } = render(<App sortable={sortable} />)
    await waitFor(() => {
      expect(getByText('Name')).toBeDefined()
    })
    appReducer.mockClear()
    const header = getByText('Name')
    act(() => {
      header.click()
    })
    if (sortable) {
      expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_ORDER', orderBy: 'Name' })
    } else {
      expect(appReducer).not.toHaveBeenCalled()
    }
  })

  it.each([undefined, false, true])('dispatches SET_SELECTION when clicking on selection cell if selectable is passed to the component - test with selectable=%s', async (selectable) => {
    const { getByText } = render(<App selectable={selectable} />)
    const index = 5
    await waitFor(() => {
      expect(getByText(index)).toBeDefined()
    })
    appReducer.mockClear()
    const cell = getByText(index)
    act(() => {
      cell.click()
    })
    if (selectable) {
      expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start: index, end: index + 1 }], anchor:index })
    } else {
      expect(appReducer).not.toHaveBeenCalled()
    }
  })

  it('selects two rows when clicking on two checkboxes', async () => {
    const { getByText } = render(<App selectable />)
    const start = 2
    const end = 5
    await waitFor(() => {
      expect(getByText(start)).toBeDefined()
    })
    appReducer.mockClear()
    const startCell = getByText(start)
    const endCell = getByText(end)
    act(() => {
      startCell.click()
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start, end: start + 1 }], anchor: start })
    appReducer.mockClear()

    act(() => {
      endCell.click()
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start, end: start + 1 }, { start: end, end: end + 1 }], anchor: end })
  })

  it('unselects a previously selected row when clicking again', async () => {
    const { getByText } = render(<App selectable />)
    const index = 2
    await waitFor(() => {
      expect(getByText(index)).toBeDefined()
    })
    appReducer.mockClear()
    const cell = getByText(index)
    act(() => {
      cell.click()
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start: index, end: index + 1 }], anchor: index })
    appReducer.mockClear()

    act(() => {
      cell.click()
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [], anchor: index })
  })

  it('selects a range when clicking then shift-clicking', async () => {
    const { getByText } = render(<App selectable />)
    const start = 2
    const end = 5
    await waitFor(() => {
      expect(getByText(start)).toBeDefined()
    })
    appReducer.mockClear()
    const startCell = getByText(start)
    const endCell = getByText(end)
    act(() => {
      startCell.click()
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start, end: start + 1 }], anchor: start })
    appReducer.mockClear()

    await act(async () => {
      // see https://testing-library.com/docs/user-event/setup/#starting-a-session-per-setup
      const user = userEvent.setup()
      await user.keyboard('[ShiftLeft>]') // Press Shift (without releasing it)
      await user.click(endCell) // Perform a click with `shiftKey: true`
    })
    expect(appReducer).toHaveBeenCalledWith(expect.anything(), { type: 'SET_SELECTION', selection: [{ start, end: end + 1 }], anchor: start })
  })
})
