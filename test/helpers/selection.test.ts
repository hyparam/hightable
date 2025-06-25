import { describe, expect, it, test, vi } from 'vitest'
import { DataFrame, sortableDataFrame } from '../../src/helpers/dataframe.js'
import { AsyncRow, Row } from '../../src/helpers/row.js'
import { areAllSelected, areValidRanges, convertSelection, extendFromAnchor, invertPermutationIndexes, isSelected, isValidIndex, isValidRange, Ranges, selectRange, toggleAll, toggleAllIndices, toggleIndex, toggleIndexInSelection, toggleRangeInSelection, toggleRangeInTable, unselectRange } from '../../src/helpers/selection.js'
import { wrapResolved } from '../../src/utils/promise.js'

describe('an index', () => {
  test('is a positive integer', () => {
    expect(isValidIndex(0)).toBe(true)
    expect(isValidIndex(1)).toBe(true)
    expect(isValidIndex(1.5)).toBe(false)
    expect(isValidIndex(-1)).toBe(false)
    expect(isValidIndex(NaN)).toBe(false)
    expect(isValidIndex(Infinity)).toBe(false)
  })
})

describe('a range', () => {
  test('cannot be empty', () => {
    expect(isValidRange({ start: 7, end: 7 })).toBe(false)
  })

  test('expects end to be greater than start', () => {
    expect(isValidRange({ start: 7, end: 8 })).toBe(true)
    expect(isValidRange({ start: 8, end: 7 })).toBe(false)
  })

  test('expects start and end to be positive integers', () => {
    expect(isValidRange({ start: 0, end: 1 })).toBe(true)
    expect(isValidRange({ start: 0, end: 1.5 })).toBe(false)
    expect(isValidRange({ start: -1, end: 1 })).toBe(false)
    expect(isValidRange({ start: 0, end: NaN })).toBe(false)
    expect(isValidRange({ start: 0, end: Infinity })).toBe(false)
  })
})

describe('selection ranges', () => {
  test('can be empty', () => {
    expect(areValidRanges([])).toBe(true)
  })

  test('have valid ranges', () => {
    expect(areValidRanges([{ start: 0, end: 1 }])).toBe(true)
    expect(areValidRanges([{ start: 1, end: 0 }])).toBe(false)
    expect(areValidRanges([{ start: -1, end: 1 }])).toBe(false)
    expect(areValidRanges([{ start: NaN, end: 1 }])).toBe(false)
    expect(areValidRanges([{ start: 0, end: Infinity }])).toBe(false)
  })

  test('have ordered ranges', () => {
    expect(areValidRanges([{ start: 0, end: 1 }, { start: 2, end: 3 }])).toBe(true)
    expect(areValidRanges([{ start: 2, end: 3 }, { start: 0, end: 1 }])).toBe(false)
  })

  test('have non-overlapping, separated ranges', () => {
    expect(areValidRanges([{ start: 0, end: 1 }, { start: 2, end: 3 }])).toBe(true)
    expect(areValidRanges([{ start: 0, end: 1 }, { start: 0, end: 1 }])).toBe(false)
    expect(areValidRanges([{ start: 0, end: 2 }, { start: 1, end: 3 }])).toBe(false)
    expect(areValidRanges([{ start: 0, end: 2 }, { start: 2, end: 3 }])).toBe(false)
  })

  test('can contain any number of ranges', () => {
    expect(areValidRanges([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }])).toBe(true)
  })
})

describe('toggling an index', () => {
  test('should throw an error if the index is invalid', () => {
    expect(() => toggleIndex({ ranges: [], index: -1 })).toThrow('Invalid index')
  })

  test('should throw an error if the selection is invalid', () => {
    expect(() => toggleIndex({ ranges: [{ start: 1, end: 0 }], index: 0 })).toThrow('Invalid ranges')
  })

  test('should add a new range if outside and separated from existing ranges', () => {
    expect(toggleIndex({ ranges: [], index: 0 })).toEqual([{ start: 0, end: 1 }])
    expect(toggleIndex({ ranges: [{ start: 0, end: 1 }, { start: 4, end: 5 }], index: 2 })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }])
  })

  test('should merge with the previous and/or following ranges if adjacent', () => {
    expect(toggleIndex({ ranges: [{ start: 0, end: 1 }], index: 1 })).toEqual([{ start: 0, end: 2 }])
    expect(toggleIndex({ ranges: [{ start: 1, end: 2 }], index: 0 })).toEqual([{ start: 0, end: 2 }])
    expect(toggleIndex({ ranges: [{ start: 0, end: 1 }, { start: 2, end: 3 }], index: 1 })).toEqual([{ start: 0, end: 3 }])
  })

  test('should split a range if the index is inside', () => {
    expect(toggleIndex({ ranges: [{ start: 0, end: 2 }], index: 1 })).toEqual([{ start: 0, end: 1 }])
    expect(toggleIndex({ ranges: [{ start: 0, end: 2 }], index: 0 })).toEqual([{ start: 1, end: 2 }])
    expect(toggleIndex({ ranges: [{ start: 0, end: 3 }], index: 1 })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }])
  })

  test('should remove a range if it\'s only the index', () => {
    expect(toggleIndex({ ranges: [{ start: 0, end: 1 }], index: 0 })).toEqual([])
  })

  test('twice should be idempotent', () => {
    const a = toggleIndex({ ranges: [], index: 0 })
    const b = toggleIndex({ ranges: a, index: 0 })
    expect(b).toEqual([])
  })
})

describe('isSelected', () => {
  test('should return true if the index is selected', () => {
    expect(isSelected({ ranges: [{ start: 0, end: 1 }], index: 0 })).toBe(true)
    expect(isSelected({ ranges: [{ start: 0, end: 2 }], index: 1 })).toBe(true)
    expect(isSelected({ ranges: [{ start: 0, end: 1 }], index: 1 })).toBe(false)
  })
  test('should throw an error if the index is invalid', () => {
    expect(() => isSelected({ ranges: [], index: -1 })).toThrow('Invalid index')
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => isSelected({ ranges: [{ start: 1, end: 0 }], index: 0 })).toThrow('Invalid ranges')
  })
})

describe('areAllSelected', () => {
  test('should return true if all indices are selected', () => {
    expect(areAllSelected({ ranges: [{ start: 0, end: 3 }], length: 3 })).toBe(true)
    expect(areAllSelected({ ranges: [{ start: 0, end: 1 }], length: 3 })).toBe(false)
    expect(areAllSelected({ ranges: [{ start: 1, end: 3 }], length: 3 })).toBe(false)
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => areAllSelected({ ranges: [{ start: 1, end: 0 }], length: 0 })).toThrow('Invalid ranges')
  })
  test('should throw an error if the length is invalid', () => {
    expect(() => areAllSelected({ ranges: [], length: -1 })).toThrow('Invalid length')
  })
  test('should return false if the length is zero', () => {
    expect(areAllSelected({ ranges: [], length: 0 })).toBe(false)
  })
})

describe('toggleAll', () => {
  test('should return an empty selection if all indices are selected', () => {
    expect(toggleAll({ ranges: [{ start: 0, end: 3 }], length: 3 })).toEqual([])
  })
  test('should return a selection with all indices if none are selected', () => {
    expect(toggleAll({ ranges: [], length: 3 })).toEqual([{ start: 0, end: 3 }])
  })
  test('should return a selection with all indices if some are selected', () => {
    expect(toggleAll({ ranges: [{ start: 0, end: 1 }], length: 3 })).toEqual([{ start: 0, end: 3 }])
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => toggleAll({ ranges: [{ start: 1, end: 0 }], length: 0 })).toThrow('Invalid ranges')
  })
  test('should throw an error if the length is invalid', () => {
    expect(() => toggleAll({ ranges: [], length: -1 })).toThrow('Invalid length')
  })
})

describe('toggleAllIndices', () => {
  test('should return empty selection if all specified indices are selected', () => {
    const indices = [0, 2, 5, 7]
    const ranges = [{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 5, end: 6 }, { start: 7, end: 8 }]
    expect(toggleAllIndices({ ranges, indices })).toEqual([])
  })
  
  test('should select all specified indices if none are selected', () => {
    const indices = [1, 3, 5]
    const ranges: Ranges = []
    const result = toggleAllIndices({ ranges, indices })
    // Should create individual ranges for each index and potentially merge adjacent ones
    expect(result).toEqual([{ start: 1, end: 2 }, { start: 3, end: 4 }, { start: 5, end: 6 }])
  })
  
  test('should select remaining indices if some are selected', () => {
    const indices = [1, 2, 4, 5]
    const ranges = [{ start: 1, end: 2 }] // Only index 1 is selected
    const result = toggleAllIndices({ ranges, indices })
    // Should select all indices, and merge adjacent ones
    expect(result).toEqual([{ start: 1, end: 3 }, { start: 4, end: 6 }])
  })
  
  test('should handle non-contiguous indices correctly', () => {
    const indices = [10, 25, 30, 100]
    const ranges: Ranges = []
    const result = toggleAllIndices({ ranges, indices })
    expect(result).toEqual([{ start: 10, end: 11 }, { start: 25, end: 26 }, { start: 30, end: 31 }, { start: 100, end: 101 }])
  })
  
  test('should return empty selection if indices array is empty', () => {
    const indices: number[] = []
    const ranges = [{ start: 0, end: 5 }]
    expect(toggleAllIndices({ ranges, indices })).toEqual([])
  })
  
  test('should throw an error if ranges are invalid', () => {
    const indices = [1, 2, 3]
    const ranges = [{ start: 2, end: 1 }] // Invalid range
    expect(() => toggleAllIndices({ ranges, indices })).toThrow('Invalid ranges')
  })
})

describe('selectRange', () => {
  test('should throw an error if the range is invalid', () => {
    expect(() => selectRange({ ranges: [], range: { start: -1, end: 0 } })).toThrow('Invalid range')
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => selectRange({ ranges: [{ start: 1, end: 0 }], range: { start: -1, end: 0 } })).toThrow('Invalid ranges')
  })
  test('should add a new range if outside and separated from existing ranges', () => {
    expect(selectRange({ ranges: [], range: { start: 0, end: 1 } })).toEqual([{ start: 0, end: 1 }])
    expect(selectRange({ ranges: [{ start: 0, end: 1 }, { start: 4, end: 5 }], range: { start: 2, end: 3 } })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }])
  })
  test('should merge with the previous and/or following ranges if adjacent', () => {
    expect(selectRange({ ranges: [{ start: 0, end: 1 }], range: { start: 1, end: 2 } })).toEqual([{ start: 0, end: 2 }])
    expect(selectRange({ ranges: [{ start: 1, end: 2 }], range: { start: 0, end: 1 } })).toEqual([{ start: 0, end: 2 }])
    expect(selectRange({ ranges: [{ start: 0, end: 1 }, { start: 2, end: 3 }], range: { start: 1, end: 2 } })).toEqual([{ start: 0, end: 3 }])
  })
})

describe('unselectRange', () => {
  test('should throw an error if the range is invalid', () => {
    expect(() => unselectRange({ ranges: [], range: { start: -1, end: 0 } })).toThrow('Invalid range')
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => unselectRange({ ranges: [{ start: 1, end: 0 }], range: { start: -1, end: 0 } })).toThrow('Invalid ranges')
  })
  test('should remove the range if it exists', () => {
    expect(unselectRange({ ranges: [{ start: 0, end: 1 }], range: { start: 0, end: 1 } })).toEqual([])
    expect(unselectRange({ ranges: [{ start: 0, end: 1 }, { start: 2, end: 3 }], range: { start: 0, end: 1 } })).toEqual([{ start: 2, end: 3 }])
    expect(unselectRange({ ranges: [{ start: 0, end: 1 }, { start: 2, end: 3 }], range: { start: 2, end: 3 } })).toEqual([{ start: 0, end: 1 }])
  })
  test('should split the range if it is inside', () => {
    expect(unselectRange({ ranges: [{ start: 0, end: 3 }], range: { start: 1, end: 2 } })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }])
  })
  test('should do nothing if the range does not intersect with the selection', () => {
    expect(unselectRange({ ranges: [{ start: 0, end: 1 }], range: { start: 2, end: 3 } })).toEqual([{ start: 0, end: 1 }])
    expect(unselectRange({ ranges: [{ start: 0, end: 1 }, { start: 4, end: 5 }], range: { start: 2, end: 3 } })).toEqual([{ start: 0, end: 1 }, { start: 4, end: 5 }])
  })
})

describe('extendFromAnchor', () => {
  test('should throw an error if the selection is invalid', () => {
    expect(() => extendFromAnchor({ ranges: [{ start: 1, end: 0 }], anchor: 0, index: 1 })).toThrow('Invalid ranges')
  })
  test('does nothing if the anchor is undefined', () => {
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], index: 1 })).toEqual([{ start: 0, end: 1 }])
  })
  test('toggles the row if the anchor and the index are the same', () => {
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], anchor: 0, index: 0 })).toEqual([])
  })
  test('should throw an error if the anchor or the index are invalid', () => {
    expect(() => extendFromAnchor({ ranges: [], anchor: -1, index: 0 })).toThrow('Invalid anchor')
    expect(() => extendFromAnchor({ ranges: [], anchor: 0, index: -1 })).toThrow('Invalid index')
  })
  test('should select the range between the bounds (inclusive) if anchor was selected', () => {
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], anchor: 0, index: 1 })).toEqual([{ start: 0, end: 2 }])
    expect(extendFromAnchor({ ranges: [{ start: 1, end: 2 }], anchor: 1, index: 0 })).toEqual([{ start: 0, end: 2 }])
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }, { start: 3, end: 4 }], anchor: 0, index: 5 })).toEqual([{ start: 0, end: 6 }])
  })
  test('should unselect the range between the bounds (inclusive) if anchor was not selected', () => {
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], anchor: 2, index: 3 })).toEqual([{ start: 0, end: 1 }])
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], anchor: 2, index: 0 })).toEqual([])
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }, { start: 3, end: 4 }], anchor: 2, index: 3 })).toEqual([{ start: 0, end: 1 }])
  })
})

const data = [
  { id: 3, name: 'Charlie', age: 25 },
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 20 },
  { id: 4, name: 'Dani', age: 20 },
].map((cells, index) => ({ cells, index }))

export function wrapObject({ index, cells }: Row): AsyncRow {
  return {
    index: wrapResolved(index),
    cells: Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, wrapResolved(value)])
    ),
  }
}

const dataFrame: DataFrame = {
  header: ['id', 'name', 'age'],
  numRows: data.length,
  rows({ start, end }): AsyncRow[] {
    // Return the slice of data between start and end indices
    return data.slice(start, end).map(wrapObject)
  },
  sortable: false,
}

const sortableDf = sortableDataFrame(dataFrame)

describe('invertPermutationIndexes', () => {
  it('should throw an error if an index is negative', () => {
    expect(
      () => invertPermutationIndexes([-1])
    ).toThrow('Invalid index: out of bounds')
  })
  it('should throw an error if an index is greater or equal to the number of elements', () => {
    expect(
      () => invertPermutationIndexes([1])
    ).toThrow('Invalid index: out of bounds')
  })
  it('should throw an error if an index is not an integer', () => {
    expect(
      () => invertPermutationIndexes([0.5, 1])
    ).toThrow('Invalid index: not an integer')
  })
  it('should throw an error if an index is duplicated', () => {
    expect(
      () => invertPermutationIndexes([0, 0])
    ).toThrow('Duplicate index')
  })
  it.for([
    [[], []],
    [[0], [0]],
    [[5, 0, 3, 1, 2, 4], [1, 3, 4, 2, 5, 0]],
  ])('should invert the permutation indexes', ([dataIndexes, expectedTableIndexes]) => {
    expect(invertPermutationIndexes(dataIndexes)).toEqual(expectedTableIndexes)
  })
})

describe('convertSelection', () => {
  const permutationIndexes = [1, 3, 4, 2, 5, 0]
  it('should throw an error if the ranges are invalid', () => {
    expect(
      () => convertSelection({ selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 }, permutationIndexes })
    ).toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', () => {
    expect(
      () => convertSelection({ selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, permutationIndexes })
    ).toThrow('Invalid anchor')
  })
  it('should return the same ranges, but not the same anchor, if no row is selected', () => {
    // the anchor index is 2, its permuted index is 4
    expect(
      convertSelection({ selection: { ranges: [], anchor: 2 }, permutationIndexes })
    ).toEqual({ ranges: [], anchor: 4 })
  })
  it('should return the same ranges, but not the same anchor, if all the rows are selected', () => {
    const numRows = permutationIndexes.length
    expect(
      convertSelection({ selection: { ranges: [{ start: 0, end: numRows }], anchor: 2 }, permutationIndexes })
    ).toEqual({ ranges: [{ start: 0, end: numRows }], anchor: 4 })
  })
  it('should translate the ranges and the anchor, if some rows are selected', () => {
    // Rows 0 and 1 are selected, and their permuted indexes are 1 and 3. The anchor is 2 -> permuted: 4.
    expect(
      convertSelection({ selection: { ranges: [{ start: 0, end: 2 }], anchor: 2 }, permutationIndexes })
    ).toEqual({ ranges: [{ start: 1, end: 2 }, { start: 3, end: 4 }], anchor: 4 })
  })
})

describe('toggleIndexInSelection', () => {
  it('should throw an error if the index is invalid', () => {
    expect(
      () => toggleIndexInSelection({ index: -3, selection: { ranges: [{ start: 0, end: 1 }], anchor: 0 } })
    ).toThrow('Invalid index')
  })
  it('should throw an error if the ranges are invalid', () => {
    expect(
      () => toggleIndexInSelection({ index: 0, selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 } })
    ).toThrow('Invalid ranges')
  })
  it('should toggle the index', () => {
    expect(
      toggleIndexInSelection({ index: 0, selection: { ranges: [{ start: 0, end: 1 }], anchor: 4 } })
    ).toEqual({ ranges: [], anchor: 0 })
  })
})

describe('toggleRangeInSelection', () => {
  it('should throw an error if the index is invalid', () => {
    expect(
      () => toggleRangeInSelection({ index: -3, selection: { ranges: [{ start: 0, end: 1 }], anchor: 0 } })
    ).toThrow('Invalid index')
  })
  it('should throw an error if the ranges are invalid', () => {
    expect(
      () => toggleRangeInSelection({ index: 0, selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 } })
    ).toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', () => {
    expect(
      () => toggleRangeInSelection({ index: 0, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 } })
    ).toThrow('Invalid anchor')
  })
  it('should extend the selection on unsorted rows', () => {
    expect(
      toggleRangeInSelection({ index: 0, selection: { ranges: [{ start: 2, end: 5 }], anchor: 4 } })
    ).toEqual({ ranges: [{ start: 0, end: 5 }], anchor: 0 })
  })
})

describe('toggleRangeInTable', () => {
  // default values
  const selection = { ranges: [{ start: 1, end: 2 }], anchor: 1 }
  const orderBy = [{ column: 'name', direction: 'ascending' as const }]
  const data = sortableDf
  const ranksMap = new Map()
  const setRanksMap = vi.fn()
  const props = { tableIndex: 2, selection, orderBy, data, ranksMap, setRanksMap }
  // { id: 3, name: 'Charlie', age: 25 },
  // { id: 1, name: 'Alice', age: 30 },
  // { id: 2, name: 'Bob', age: 20 },
  // { id: 4, name: 'Dani', age: 20 },
  const ageRanks = [2, 3, 0, 0]
  const nameRanks = [2, 0, 1, 3]
  const indexRanks = [0, 1, 2, 3]
  it('should throw an error if the table index is invalid', async () => {
    await expect(
      toggleRangeInTable({ ...props, tableIndex: -3 })
    ).rejects.toThrow('Invalid index')
  })
  it('should throw an error if the ranges are invalid', async () => {
    await expect(
      toggleRangeInTable({ ...props, selection: { ...selection, ranges: [{ start: 1, end: 0 }] } })
    ).rejects.toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', async () => {
    await expect(
      toggleRangeInTable({ ...props, selection: { ...selection, anchor: -3 } })
    ).rejects.toThrow('Invalid anchor')
  })
  it('should throw an error if the orderBy column is not in the data headers', async () => {
    await expect(
      toggleRangeInTable({ ...props, orderBy: [{ column: 'doesnotexist', direction: 'ascending' }] })
    ).rejects.toThrow('Invalid column: doesnotexist')
  })
  it('should throw an error if the data is not sortable', async () => {
    await expect(
      toggleRangeInTable({ ...props, data: { ...sortableDf, sortable: false } })
    ).rejects.toThrow('Data frame is not sortable')
  })
  it('should extend the selection (ascending order)', async () => {
    /**
     * sorted rows:
     * { name: 'Alice' }, index: 1
     * { name: 'Bob' }, index: 2
     * { name: 'Charlie' }, index: 0
     * { name: 'Dani' }, index: 3
     *
     * current selection: index=1 (Alice)
     *
     * extend to Charlie (index 0) using tableIndex: 2
     *
     * new selection: indexes=1,2,0 (Alice, Bob, Charlie)
     *
     * the new anchor is the data index of tableIndex 2, which is 0
     */
    await expect(
      toggleRangeInTable(props)
    ).resolves.toEqual({ ranges: [{ start: 0, end: 3 }], anchor: 0 })
  })
  it('should extend the selection (descending order)', async () => {
    /**
     * sorted rows:
     * { name: 'Dani' }, index: 3
     * { name: 'Charlie' }, index: 0
     * { name: 'Bob' }, index: 2
     * { name: 'Alice' }, index: 1
     *
     * current selection: index=1 (Alice)
     *
     * extend to Bob (index 2) using tableIndex=2
     *
     * new selection: indexes=1,2 (Alice, Bob)
     *
     * the new anchor is the data index of tableIndex 2, which is 2
     */
    await expect(
      toggleRangeInTable({ ...props, orderBy: [{ column: 'name', direction: 'descending' }] })
    ).resolves.toEqual({ ranges: [{ start: 1, end: 3 }], anchor: 2 })
  })
  it('should call setRanksMap if new ranks are computed', async () => {
    let cachedRanksMap = new Map<string, Promise<number[]>>()
    const setRanksMap = vi.fn(function (setter: (ranksMap: Map<string, Promise<number[]>>) => Map<string, Promise<number[]>>) {
      cachedRanksMap = setter(cachedRanksMap)
    })
    await toggleRangeInTable({ ...props, setRanksMap })
    expect(setRanksMap).toHaveBeenCalledOnce()
    expect(cachedRanksMap).toEqual(new Map([['name', Promise.resolve(nameRanks)], ['', Promise.resolve(indexRanks)]]))
  })
  it('should extend the selection using ranksMap if provided', async () => {
    /**
     * sorted rows (by age, not by name, since it's what the wrong ranks map provides):
     * { name: 'Bob' }, index: 2
     * { name: 'Dani' }, index: 3
     * { name: 'Charlie' }, index: 0
     * { name: 'Alice' }, index: 1
     *
     * current selection: index=1 (Alice)
     *
     * extend to Charlie (index 0) using tableIndex=2
     *
     * new selection: indexes=0,1 (Charlie, Alice)
     *
     * the new anchor is the data index of tableIndex 2, which is 0
     */
    const wrongButTrustedRanksMap = new Map([['name', Promise.resolve(ageRanks)]])
    await expect(
      toggleRangeInTable({ ...props, ranksMap: wrongButTrustedRanksMap })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 2 }], anchor: 0 })
  })
  it('should not call setRanksMap if all ranks are provided', async () => {
    const setRanksMap = vi.fn()
    await toggleRangeInTable({ ...props, ranksMap: new Map([['name', Promise.resolve(nameRanks)], ['', Promise.resolve(indexRanks)]]), setRanksMap })
    expect(setRanksMap).not.toHaveBeenCalled()
  })
})
