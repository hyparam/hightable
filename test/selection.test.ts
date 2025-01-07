import { describe, expect, test } from 'vitest'
import { areAllSelected, isSelected, isValidIndex, isValidRange, isValidSelection, toggleAll, toggleIndex } from '../src/selection.js'

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

describe('a selection', () => {
  test('can be empty', () => {
    expect(isValidSelection([])).toBe(true)
  })

  test('has valid ranges', () => {
    expect(isValidSelection([{ start: 0, end: 1 }])).toBe(true)
    expect(isValidSelection([{ start: 1, end: 0 }])).toBe(false)
    expect(isValidSelection([{ start: -1, end: 1 }])).toBe(false)
    expect(isValidSelection([{ start: NaN, end: 1 }])).toBe(false)
    expect(isValidSelection([{ start: 0, end: Infinity }])).toBe(false)
  })

  test('has ordered ranges', () => {
    expect(isValidSelection([{ start: 0, end: 1 }, { start: 2, end: 3 }])).toBe(true)
    expect(isValidSelection([{ start: 2, end: 3 }, { start: 0, end: 1 }])).toBe(false)
  })

  test('has non-overlapping, separated ranges', () => {
    expect(isValidSelection([{ start: 0, end: 1 }, { start: 2, end: 3 }])).toBe(true)
    expect(isValidSelection([{ start: 0, end: 1 }, { start: 0, end: 1 }])).toBe(false)
    expect(isValidSelection([{ start: 0, end: 2 }, { start: 1, end: 3 }])).toBe(false)
    expect(isValidSelection([{ start: 0, end: 2 }, { start: 2, end: 3 }])).toBe(false)
  })

  test('can contain any number of ranges', () => {
    expect(isValidSelection([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }])).toBe(true)
  })
})

describe('toggling an index', () => {
  test('should throw an error if the index is invalid', () => {
    expect(() => toggleIndex({ selection: [], index: -1 })).toThrow('Invalid index')
  })

  test('should throw an error if the selection is invalid', () => {
    expect(() => toggleIndex({ selection: [{ start: 1, end: 0 }], index: 0 })).toThrow('Invalid selection')
  })

  test('should add a new range if outside and separated from existing ranges', () => {
    expect(toggleIndex({ selection: [], index: 0 })).toEqual([{ start: 0, end: 1 }])
    expect(toggleIndex({ selection: [{ start: 0, end: 1 }, { start: 4, end: 5 }], index: 2 })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }, { start: 4, end: 5 }])
  })

  test('should merge with the previous and/or following ranges if adjacent', () => {
    expect(toggleIndex({ selection: [{ start: 0, end: 1 }], index: 1 })).toEqual([{ start: 0, end: 2 }])
    expect(toggleIndex({ selection: [{ start: 1, end: 2 }], index: 0 })).toEqual([{ start: 0, end: 2 }])
    expect(toggleIndex({ selection: [{ start: 0, end: 1 }, { start: 2, end: 3 }], index: 1 })).toEqual([{ start: 0, end: 3 }])
  })

  test('should split a range if the index is inside', () => {
    expect(toggleIndex({ selection: [{ start: 0, end: 2 }], index: 1 })).toEqual([{ start: 0, end: 1 }])
    expect(toggleIndex({ selection: [{ start: 0, end: 2 }], index: 0 })).toEqual([{ start: 1, end: 2 }])
    expect(toggleIndex({ selection: [{ start: 0, end: 3 }], index: 1 })).toEqual([{ start: 0, end: 1 }, { start: 2, end: 3 }])
  })

  test('should remove a range if it\'s only the index', () => {
    expect(toggleIndex({ selection: [{ start: 0, end: 1 }], index: 0 })).toEqual([])
  })

  test('twice should be idempotent', () => {
    const a = toggleIndex({ selection: [], index: 0 })
    const b = toggleIndex({ selection: a, index: 0 })
    expect(b).toEqual([])
  })
})

describe('isSelected', () => {
  test('should return true if the index is selected', () => {
    expect(isSelected({ selection: [{ start: 0, end: 1 }], index: 0 })).toBe(true)
    expect(isSelected({ selection: [{ start: 0, end: 2 }], index: 1 })).toBe(true)
    expect(isSelected({ selection: [{ start: 0, end: 1 }], index: 1 })).toBe(false)
  })
  test('should throw an error if the index is invalid', () => {
    expect(() => isSelected({ selection: [], index: -1 })).toThrow('Invalid index')
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => isSelected({ selection: [{ start: 1, end: 0 }], index: 0 })).toThrow('Invalid selection')
  })
})

describe('areAllSelected', () => {
  test('should return true if all indices are selected', () => {
    expect(areAllSelected({ selection: [{ start: 0, end: 3 }], length: 3 })).toBe(true)
    expect(areAllSelected({ selection: [{ start: 0, end: 1 }], length: 3 })).toBe(false)
    expect(areAllSelected({ selection: [{ start: 1, end: 3 }], length: 3 })).toBe(false)
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => areAllSelected({ selection: [{ start: 1, end: 0 }], length: 0 })).toThrow('Invalid selection')
  })
  test('should throw an error if the length is invalid', () => {
    expect(() => areAllSelected({ selection: [], length: -1 })).toThrow('Invalid length')
  })
})

describe('toggleAll', () => {
  test('should return an empty selection if all indices are selected', () => {
    expect(toggleAll({ selection: [{ start: 0, end: 3 }], length: 3 })).toEqual([])
  })
  test('should return a selection with all indices if none are selected', () => {
    expect(toggleAll({ selection: [], length: 3 })).toEqual([{ start: 0, end: 3 }])
  })
  test('should return a selection with all indices if some are selected', () => {
    expect(toggleAll({ selection: [{ start: 0, end: 1 }], length: 3 })).toEqual([{ start: 0, end: 3 }])
  })
  test('should throw an error if the selection is invalid', () => {
    expect(() => toggleAll({ selection: [{ start: 1, end: 0 }], length: 0 })).toThrow('Invalid selection')
  })
  test('should throw an error if the length is invalid', () => {
    expect(() => toggleAll({ selection: [], length: -1 })).toThrow('Invalid length')
  })
})
