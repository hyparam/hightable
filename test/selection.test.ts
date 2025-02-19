import { describe, expect, it, test } from 'vitest'
import { DataFrame, sortableDataFrame } from '../src/dataframe.js'
import { wrapPromise } from '../src/promise.js'
import { AsyncRow, Row } from '../src/row.js'
import { areAllSelected, areValidRanges, computeNewSelection, extendFromAnchor, isSelected, isValidIndex, isValidRange, selectRange, toDataSelection, toTableSelection, toggleAll, toggleIndex, unselectRange } from '../src/selection.js'

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
  test('does nothing if the anchor and the index are the same', () => {
    expect(extendFromAnchor({ ranges: [{ start: 0, end: 1 }], anchor: 0, index: 0 })).toEqual([{ start: 0, end: 1 }])
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
    index: wrapPromise(index),
    cells: Object.fromEntries(
      Object.entries(cells).map(([key, value]) => [key, wrapPromise(value)])
    ),
  }
}

const dataFrame: DataFrame = {
  header: ['id', 'name', 'age'],
  numRows: data.length,
  rows(start: number, end: number): AsyncRow[] {
    // Return the slice of data between start and end indices
    return data.slice(start, end).map(wrapObject)
  },
  sortable: false,
}

const sortableDf = sortableDataFrame(dataFrame)

describe('toTableSelection', () => {
  it('should throw an error if the ranges are invalid', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 }, orderBy: undefined, data: sortableDf })
    ).rejects.toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: undefined, data: sortableDf })
    ).rejects.toThrow('Invalid anchor')
  })
  it('should throw an error if the orderBy column is not in the data headers', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: { column: 'doesnotexist' }, data: sortableDf })
    ).rejects.toThrow('orderBy column is not in the data frame')
  })
  it('should throw an error if the orderBy column is set but the data is not sortable', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: { column: 'id' }, data: { ...sortableDf, sortable: false } })
    ).rejects.toThrow('Data frame is not sortable')
  })
  it('should return the same selection if the data is not sorted', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: undefined, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 1 }] })
  })
  it('should return the same ranges, but not the same anchor, if no row is selected', async () => {
    // the anchor data index is 2, ie: the third row (name=Bob) - its table index when sorted by id is 1
    await expect(
      toTableSelection({ selection: { ranges: [], anchor: 2 }, orderBy: { column: 'id' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [], anchor: 1 })
  })
  it('should return the same ranges, but not the same anchor, if all the rows are selected', async () => {
    await expect(
      toTableSelection({ selection: { ranges: [{ start: 0, end: sortableDf.numRows }], anchor: 2 }, orderBy: { column: 'id' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: sortableDf.numRows }], anchor: 1 })
  })
  // add more tests here

})

describe('toDataSelection', () => {
  it('should throw an error if the ranges are invalid', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 }, orderBy: undefined, data: sortableDf })
    ).rejects.toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: undefined, data: sortableDf })
    ).rejects.toThrow('Invalid anchor')
  })
  it('should throw an error if the orderBy column is not in the data headers', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: { column: 'doesnotexist' }, data: sortableDf })
    ).rejects.toThrow('orderBy column is not in the data frame')
  })
  it('should throw an error if the orderBy column is set but the data is not sortable', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: { column: 'id' }, data: { ...sortableDf, sortable: false } })
    ).rejects.toThrow('Data frame is not sortable')
  })
  it('should return the same selection if the data is not sorted', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 0, end: 1 }] }, orderBy: undefined, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 1 }] })
  })
  it('should return the same ranges, but not the same anchor, if no row is selected', async () => {
    // the anchor data index is 2, ie: the third row (name=Bob) - its table index when sorted by id is 1
    await expect(
      toDataSelection({ selection: { ranges: [], anchor: 1 }, orderBy: { column: 'id' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [], anchor: 2 })
  })
  it('should return the same ranges, but not the same anchor, if all the rows are selected', async () => {
    await expect(
      toDataSelection({ selection: { ranges: [{ start: 0, end: sortableDf.numRows }], anchor: 1 }, orderBy: { column: 'id' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: sortableDf.numRows }], anchor: 2 })
  })
  // add more tests here
})

describe('computeNewSelection', () => {
  it('should throw an error if the index is invalid', async () => {
    await expect(
      computeNewSelection({ tableIndex: -3, selection: { ranges: [{ start: 0, end: 1 }], anchor: 0 } })
    ).rejects.toThrow('Invalid index')
  })
  it('should throw an error if the ranges are invalid', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 1, end: 0 }], anchor: 0 } })
    ).rejects.toThrow('Invalid ranges')
  })
  it('should throw an error if the anchor is invalid and the selection must be extended', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, useAnchor: true })
    ).rejects.toThrow('Invalid anchor')
  })
  it('should toggle the index if the anchor is not used', async () => {
    const tableIndex = 0
    await expect(
      computeNewSelection({ tableIndex, selection: { ranges: [{ start: 0, end: 1 }], anchor: 4 }, useAnchor: false })
    ).resolves.toEqual({ ranges: [], anchor: tableIndex })
  })
  it('should toggle the index on sorted rows if the anchor is not used', async () => {
    /**
     * sorted rows:
     * { name: 'Alice' }, index: 1
     * { name: 'Bob' }, index: 2
     * { name: 'Charlie' }, index: 0
     * { name: 'Dani' }, index: 3
     *
     * current selection: index=0 (Charlie)
     *
     * toggle the 2nd row (Bob), index 2 using tableIndex: 1
     *
     * new selection: indexes=0,2 (Charlie, Bob), the anchor is Bob's index: 2
     */
    await expect(
      computeNewSelection({ tableIndex: 1, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: { column: 'name' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 1 }, { start: 2, end: 3 }], anchor: 2 })
  })
  it('should extend the selection if the anchor is used on unsorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 2, end: 5 }], anchor: 4 }, useAnchor: true })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 5 }], anchor: 4 })
  })
  it('should throw an error if the orderBy column is not in the data headers while toggling a row on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 1, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: { column: 'doesnotexist' }, data: sortableDf })
    ).rejects.toThrow('orderBy column is not in the data frame')
  })
  it('should throw an error if the orderBy column is not in the data headers while extending a selection on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 2, end: 5 }], anchor: 4 }, useAnchor: true, orderBy: { column: 'doesnotexist' }, data: sortableDf })
    ).rejects.toThrow('orderBy column is not in the data frame')
  })
  it('should throw an error if the data is undefined while toggling a row on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: { column: 'id' } })
    ).rejects.toThrow('Missing data frame. Cannot compute the new selection.')
  })
  it('should throw an error if the data is undefined while extending a selection on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 2, end: 5 }], anchor: 4 }, useAnchor: true, orderBy: { column: 'id' } })
    ).rejects.toThrow('Missing data frame. Cannot compute the new selection.')
  })
  it('should throw and error if the data is not sortable while toggling a row on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 0, end: 1 }], anchor: -3 }, orderBy: { column: 'id' }, data: { ...sortableDf, sortable: false } })
    ).rejects.toThrow('Data frame is not sortable')
  })
  it('should throw and error if the data is not sortable while extending a selection on sorted rows', async () => {
    await expect(
      computeNewSelection({ tableIndex: 0, selection: { ranges: [{ start: 2, end: 5 }], anchor: 4 }, useAnchor: true, orderBy: { column: 'id' }, data: { ...sortableDf, sortable: false } })
    ).rejects.toThrow('Data frame is not sortable')
  })
  it('should extend the selection if the anchor is used on sorted rows', async () => {
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
     */
    await expect(
      computeNewSelection({ tableIndex: 2, selection: { ranges: [{ start: 1, end: 2 }], anchor: 1 }, useAnchor: true, orderBy: { column: 'name' }, data: sortableDf })
    ).resolves.toEqual({ ranges: [{ start: 0, end: 3 }], anchor: 1 })
  })
})
