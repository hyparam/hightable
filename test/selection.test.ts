import { describe, expect, test } from 'vitest'
import { areAllSelected, areValidRanges, extendFromAnchor, isSelected, isValidIndex, isValidRange, selectRange, toggleAll, toggleIndex, unselectRange } from '../src/selection.js'

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
    expect(() => extendFromAnchor({ ranges: [], anchor: -1, index: 0 })).toThrow('Invalid index')
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
