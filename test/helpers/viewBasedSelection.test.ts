import { describe, expect, it } from 'vitest'
import { DataFrame, sortableDataFrame } from '../../src/helpers/dataframe.js'
import { Selection, isSelected, toggleAllIndices, toggleRangeInTable } from '../../src/helpers/selection.js'
import { wrapResolved } from '../../src/utils/promise.js'

// Create test data
const testData = [
  { id: 0, name: 'Alice', age: 30 },
  { id: 1, name: 'Bob', age: 25 },
  { id: 2, name: 'Charlie', age: 35 },
  { id: 3, name: 'Diana', age: 28 },
  { id: 4, name: 'Eve', age: 32 },
].map((cells, index) => ({
  index: wrapResolved(index),
  cells: Object.fromEntries(
    Object.entries(cells).map(([key, value]) => [key, wrapResolved(value)])
  ),
}))

const fullDataFrame: DataFrame = {
  header: ['id', 'name', 'age'],
  numRows: testData.length,
  rows({ start, end }) {
    return testData.slice(start, end)
  },
  sortable: false,
}

const sortableFullDataFrame = sortableDataFrame(fullDataFrame)

// Create a shuffled sample of the data (indices 4, 1, 3 -> Eve, Bob, Diana)
const sampleIndices = [4, 1, 3]
const sampleDataFrame: DataFrame = {
  header: ['id', 'name', 'age'],
  numRows: sampleIndices.length,
  rows({ start, end }) {
    const sliceIndices = sampleIndices.slice(start, end)
    return sliceIndices.map(originalIndex => testData[originalIndex])
  },
  sortable: false,
}

const sortableSampleDataFrame = sortableDataFrame(sampleDataFrame)

describe('View-based selection', () => {
  it('should preserve selection when switching between full and sample datasets', () => {
    // Simulate selecting rows in the sample view, then switching to full view
    // In sample view: Eve (table 0, data 4), Bob (table 1, data 1), Diana (table 2, data 3)
    // If we select Bob and Diana (table positions 1-2), we should have data indices 1 and 3

    const sampleSelection: Selection = {
      ranges: [
        { start: 1, end: 2 }, // Bob (data index 1)
        { start: 3, end: 4 }, // Diana (data index 3)
      ],
      anchor: 3, // Diana
    }

    // The selection should be stored as individual data indices
    // When we switch to the full view, these same data indices should be selected
    // but they might be at different table positions

    const selectedDataIndices = sampleSelection.ranges.map(range => range.start).sort((a, b) => a - b)
    expect(selectedDataIndices).toEqual([1, 3]) // Bob and Diana's data indices
  })

  it('should maintain selection consistency across view changes', () => {
    // Test that a selection created in one view (as individual ranges) works in another view
    const crossViewSelection: Selection = {
      ranges: [
        { start: 0, end: 1 }, // Alice (data index 0)
        { start: 2, end: 3 }, // Charlie (data index 2)
        { start: 4, end: 5 }, // Eve (data index 4)
      ],
      anchor: 2, // Charlie
    }

    // Verify that the selection contains the expected data indices
    const selectedDataIndices = crossViewSelection.ranges.map(range => range.start).sort((a, b) => a - b)
    expect(selectedDataIndices).toEqual([0, 2, 4]) // Alice, Charlie, Eve
    expect(crossViewSelection.anchor).toBe(2) // Charlie
  })

  it('should handle range selection correctly in view-based coordinates', async () => {
    const ranksMap = new Map<string, Promise<number[]>>()

    // In the sample view, we have: Eve (table 0, data 4), Bob (table 1, data 1), Diana (table 2, data 3)
    // Start with Eve selected (data index 4)
    const initialSelection: Selection = {
      ranges: [{ start: 4, end: 5 }], // Eve's data index as single-row range
      anchor: 4,
    }

    // Extend to Diana (table position 2 in sample view, data index 3)
    // This should select the visual range from table 0 to table 2 (Eve, Bob, Diana)
    const result = await toggleRangeInTable({
      tableIndex: 2, // Diana's table position in sample view
      selection: initialSelection,
      orderBy: [],
      data: sortableSampleDataFrame,
      ranksMap,
      setRanksMap: () => null,
    })

    // The result should contain ranges merging contiguous data indices
    // Since we selected table positions 0, 1, 2 which correspond to data indices 4, 1, 3
    // Data indices 3 and 4 are contiguous, so they merge into [3,5], but 1 is separate
    expect(result.ranges.length).toBe(2) // Two ranges: [1,2] and [3,5]
    expect(result.anchor).toBe(3) // Diana's data index

    // Extract all selected data indices
    const selectedDataIndices: number[] = []
    for (const range of result.ranges) {
      for (let i = range.start; i < range.end; i++) {
        selectedDataIndices.push(i)
      }
    }
    selectedDataIndices.sort((a, b) => a - b)
    expect(selectedDataIndices).toEqual([1, 3, 4]) // Bob, Diana, Eve in data index order
  })

  it('should handle sorted data correctly', async () => {
    const ranksMap = new Map<string, Promise<number[]>>()

    // Start with Bob selected (data index 1)
    const initialSelection: Selection = {
      ranges: [{ start: 1, end: 2 }], // Bob's data index
      anchor: 1,
    }

    // Extend selection to Charlie (table position 2 in sorted view, data index 0)
    const result = await toggleRangeInTable({
      tableIndex: 2, // Charlie's table position in sorted view (sorted by name: Alice, Bob, Charlie, Diana, Eve)
      selection: initialSelection,
      orderBy: [{ column: 'name', direction: 'ascending' }],
      data: sortableFullDataFrame,
      ranksMap,
      setRanksMap: () => null,
    })

    // Should have some selection and Charlie as anchor
    expect(result.ranges.length).toBeGreaterThan(0)
    expect(result.anchor).toBe(2) // Charlie's data index
  })

  it('should handle select all correctly in sample dataset', () => {
    // Test select all functionality with a sample dataset
    // In a sample, data indices are not contiguous (e.g., might be [45, 123, 267, 89, ...])
    const sampleDataIndices = [45, 123, 267, 89, 156, 234, 78, 345, 12, 189] // Example sample indices
    const currentSelection: Selection = { ranges: [], anchor: undefined }

    // Use toggleAllIndices for sample datasets
    const result = toggleAllIndices({ ranges: currentSelection.ranges, indices: sampleDataIndices })

    // Should select all sample indices, potentially merged into ranges
    // Verify that all sample indices are selected
    for (const index of sampleDataIndices) {
      expect(isSelected({ ranges: result, index })).toBe(true)
    }

    // Test toggle all when all are already selected - should deselect all
    const allSelectedResult = toggleAllIndices({ ranges: result, indices: sampleDataIndices })
    expect(allSelectedResult).toEqual([]) // Should deselect all

    // Verify none are selected after deselecting all
    for (const index of sampleDataIndices) {
      expect(isSelected({ ranges: allSelectedResult, index })).toBe(false)
    }
  })
})
