import { describe, expect, it, test, vi } from 'vitest'
import { arrayDataFrame, sortableDataFrame } from '../../src/helpers/dataframe/index.js'
import { areAllSelected, areValidRanges, convertSelection, extendFromAnchor, invertPermutationIndexes, isSelected, isValidIndex, isValidRange, selectRange, toggleAll, toggleIndex, toggleIndexInSelection, toggleRangeInSelection, toggleRangeInSortedSelection, unselectRange } from '../../src/helpers/selection.js'

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
  ])('should invert the permutation indexes', ([dataIndexes, expectedindexes]) => {
    expect(invertPermutationIndexes(dataIndexes)).toEqual(expectedindexes)
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

const data = [
  { id: 3, name: 'Charlie', age: 25 },
  { id: 1, name: 'Alice', age: 30 },
  { id: 2, name: 'Bob', age: 20 },
  { id: 4, name: 'Dani', age: 20 },
]
const sortableDf = sortableDataFrame(arrayDataFrame(data))

describe('toggleRangeInSortedSelection', () => {
  // default values
  const selection = { ranges: [{ start: 1, end: 2 }], anchor: 1 }
  const orderBy = [{ column: 'name', direction: 'ascending' as const }]
  // const indexesByOrderBy = new Map()
  const props = { index: 2, selection, orderBy, data: sortableDf }
  // { id: 3, name: 'Charlie', age: 25 },
  // { id: 1, name: 'Alice', age: 30 },
  // { id: 2, name: 'Bob', age: 20 },
  // { id: 4, name: 'Dani', age: 20 },
  const ageRanks = [2, 3, 0, 0]
  const nameRanks = [2, 0, 1, 3]
  // const indexRanks = [0, 1, 2, 3]
  it('should throw an error if the table index is invalid', async () => {
    await expect(
      toggleRangeInSortedSelection({ ...props, index: -3 })
    ).rejects.toThrow('Invalid index')
  })
  it('should throw an error if the ranges are invalid', async () => {
    await expect(
      toggleRangeInSortedSelection({ ...props, selection: { ...selection, ranges: [{ start: 1, end: 0 }] } })
    ).rejects.toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', async () => {
    await expect(
      toggleRangeInSortedSelection({ ...props, selection: { ...selection, anchor: -3 } })
    ).rejects.toThrow('Invalid anchor')
  })
  it('should throw an error if the orderBy column is not in the data headers', async () => {
    await expect(
      toggleRangeInSortedSelection({ ...props, orderBy: [{ column: 'doesnotexist', direction: 'ascending' }] })
    ).rejects.toThrow('Invalid column: doesnotexist')
  })
  it('should throw an error if the data is not sortable', async () => {
    await expect(
      toggleRangeInSortedSelection({ ...props, data: { ...sortableDf, sortable: false } })
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
     * extend to Charlie (index 0) using index: 2
     *
     * new selection: indexes=1,2,0 (Alice, Bob, Charlie)
     *
     * the new anchor is the data index of index 2, which is 0
     */
    await expect(
      toggleRangeInSortedSelection(props)
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
     * extend to Bob (index 2) using index=2
     *
     * new selection: indexes=1,2 (Alice, Bob)
     *
     * the new anchor is the data index of index 2, which is 2
     */
    await expect(
      toggleRangeInSortedSelection({ ...props, orderBy: [{ column: 'name', direction: 'descending' }] })
    ).resolves.toEqual({ ranges: [{ start: 1, end: 3 }], anchor: 2 })
  })
  it('should extend the selection using ranksByColumn if provided', async () => {
    /**
     * sorted rows (by age, not by name, since it's what the wrong ranks map provides):
     * { name: 'Bob' }, index: 2
     * { name: 'Dani' }, index: 3
     * { name: 'Charlie' }, index: 0
     * { name: 'Alice' }, index: 1
     *
     * current selection: index=1 (Alice)
     *
     * extend to Charlie (index 0) using index=2
     *
     * new selection: indexes=0,1 (Charlie, Alice)
     *
     * the new anchor is the data index of index 2, which is 0
     */
    const wrongButTrustedRanksByColumn = new Map([['name', ageRanks]])
    await expect(
      toggleRangeInSortedSelection({ ...props, ranksByColumn: wrongButTrustedRanksByColumn })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 2 }], anchor: 0 })
  })
  it.each([
    undefined,
    new Map([['age', ageRanks]]),
  ])('should call setRanks if some ranks are not provided', async (ranksByColumn) => {
    const setRanks = vi.fn()
    await toggleRangeInSortedSelection({ ...props, ranksByColumn, setRanks })
    expect(setRanks).toHaveBeenCalledWith({ column: 'name', ranks: nameRanks })
  })
  it('should not call setRanks if all ranks are provided', async () => {
    const setRanks = vi.fn()
    await toggleRangeInSortedSelection({ ...props, ranksByColumn: new Map([['name', nameRanks]]), setRanks })
    expect(setRanks).not.toHaveBeenCalled()
  })
  it('should call setIndexes if some indexes are not provided', async () => {
    const setIndexes = vi.fn()
    await toggleRangeInSortedSelection({ ...props, setIndexes })
    expect(setIndexes).toHaveBeenCalledWith({ orderBy, indexes: [1, 2, 0, 3] })
  })
  it('should not call setIndexes if all indexes are provided', async () => {
    const setIndexes = vi.fn()
    await toggleRangeInSortedSelection({ ...props, indexes: [1, 2, 0, 3], setIndexes })
    expect(setIndexes).not.toHaveBeenCalled()
  })
})
