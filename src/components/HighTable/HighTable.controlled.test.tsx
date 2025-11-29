import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGetRowNumber, validateGetCellParams } from '../../helpers/dataframe/helpers.js'
import type { DataFrame } from '../../helpers/dataframe/index.js'
import type { OrderBy } from '../../helpers/sort.js'
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
