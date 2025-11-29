import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGetRowNumber, validateGetCellParams } from '../../helpers/dataframe/helpers.js'
import { DataFrame } from '../../helpers/dataframe/index.js'
import { OrderBy } from '../../helpers/sort.js'
import { render } from '../../utils/userEvent.js'
import HighTable from './HighTable.js'
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

function createOtherData(): DataFrame<{ description: string }> {
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
    await user.keyboard('{Right}{Right}{Down}{Down}')
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
    await user.keyboard('{Right}{Right}{Down}{Down}')
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
    await user.keyboard('{Right}{Right}{Down}{Down}')
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
