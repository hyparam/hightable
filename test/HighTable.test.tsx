import { fireEvent, render, waitFor } from '@testing-library/react'
import React, { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
    })

    act(() => {
      fireEvent.scroll(scrollDiv, { target: { scrollTop: 500 } })
    })

    await waitFor(() => {
      expect(mockData.rows).toHaveBeenCalledTimes(2)
    })
  })

  it('correctly handles double click on cell', async () => {
    const mockDoubleClick = vi.fn()
    const { findByText } = render(<HighTable data={mockData} onDoubleClickCell={mockDoubleClick} />)
    const cell = await findByText('Name 0')

    fireEvent.doubleClick(cell)

    expect(mockDoubleClick).toHaveBeenCalledWith(1, 0)
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
    expect(container.querySelector('.pending')).toBeNull()
  })
})
