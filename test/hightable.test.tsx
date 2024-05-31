import { fireEvent, render, waitFor } from '@testing-library/react'
import React, { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HighTable from '../src/hightable.js'

describe('HighTable', () => {
  const mockData = {
    header: ['ID', 'Name', 'Age'],
    numRows: 100,
    rows: vi.fn((start, end) => Promise.resolve(
      Array.from({ length: end - start }, (_, index) => [index + start, 'Name ' + (index + start), 20 + index % 50])
    )),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', async () => {
    const { getByText } = render(<HighTable data={mockData} setError={vi.fn()} />)
    await waitFor(() => {
      expect(getByText('ID')).toBeDefined()
    })
  })

  it('loads initial rows on mount', async () => {
    render(<HighTable data={mockData} setError={vi.fn()} />)
    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledOnce()
      expect(mockData.rows).toHaveBeenCalledWith(0, 34)
    })
  })

  it('handles scroll to load more rows', async () => {
    const { container } = render(<HighTable data={mockData} setError={vi.fn()} />)
    const scrollDiv = container.querySelector('.table-scroll')
    if (!scrollDiv) throw new Error('Scroll container not found')

    act(() => {
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledTimes(2)
    })
  })

  it('correctly handles double click on cell', async () => {
    const mockDoubleClick = vi.fn()
    const { findByText } = render(<HighTable data={mockData} setError={vi.fn()} onDoubleClickCell={mockDoubleClick} />)
    const cell = await findByText('Name 0')

    fireEvent.doubleClick(cell)

    expect(mockDoubleClick).toHaveBeenCalledWith(0, 1)
  })

  it('displays error when data fetch fails', async () => {
    const mockSetError = vi.fn()
    mockData.rows.mockRejectedValueOnce(new Error('Failed to fetch data'))
    render(<HighTable data={mockData} setError={mockSetError} />)

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(expect.any(Error))
    })
  })
})
