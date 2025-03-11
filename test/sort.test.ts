import { describe, expect, it } from 'vitest'
import { areEqualOrderBy, partitionOrderBy, toggleColumn } from '../src/sort'

describe('areEqualOrderBy', () => {
  it('should return true if the order by arrays are equal', () => {
    expect(areEqualOrderBy([], [])).toBe(true)
    expect(areEqualOrderBy([{ column: 'name' }], [{ column: 'name' }])).toBe(true)
    expect(areEqualOrderBy([{ column: 'name' }, { column: 'age' }], [{ column: 'name' }, { column: 'age' }])).toBe(true)
  })
  it('should return false if the order by arrays are not equal', () => {
    expect(areEqualOrderBy([{ column: 'name' }], [{ column: 'age' }])).toBe(false)
    expect(areEqualOrderBy([{ column: 'name' }, { column: 'age' }], [{ column: 'name' }])).toBe(false)
    expect(areEqualOrderBy([{ column: 'name' }, { column: 'age' }], [{ column: 'age' }, { column: 'name' }])).toBe(false)
  })
})

describe('partitionOrderBy', () => {
  it('should return the prefix, item and suffix of the orderBy array', () => {
    expect(partitionOrderBy([], 'name')).toEqual({ prefix: [], item: undefined, suffix: [] })
    expect(partitionOrderBy([{ column: 'name' }], 'name')).toEqual({ prefix: [], item: { column: 'name' }, suffix: [] })
    expect(partitionOrderBy([{ column: 'name' }, { column: 'age' }], 'name')).toEqual({ prefix: [], item: { column: 'name' }, suffix: [{ column: 'age' }] })
    expect(partitionOrderBy([{ column: 'name' }, { column: 'age' }], 'age')).toEqual({ prefix: [{ column: 'name' }], item: { column: 'age' }, suffix: [] })
    expect(partitionOrderBy([{ column: 'name' }, { column: 'age' }, { column: 'id' }], 'age')).toEqual({ prefix: [{ column: 'name' }], item: { column: 'age' }, suffix: [{ column: 'id' }] })
    expect(partitionOrderBy([{ column: 'name' }, { column: 'name' }], 'name')).toEqual({ prefix: [], item: { column: 'name' }, suffix: [{ column: 'name' }] })
  })
})

describe('toggleColumn', () => {
  it('should return an array with the column if the column is not in the orderBy', () => {
    expect(toggleColumn('name', [])).toEqual([{ column: 'name' }])
    expect(toggleColumn('name', [{ column: 'age' }])).toEqual([{ column: 'name' }])
    expect(toggleColumn('name', [{ column: 'age' }, { column: 'id' }])).toEqual([{ column: 'name' }])
  })
  it('should return an empty array if the column is in the orderBy', () => {
    expect(toggleColumn('name', [{ column: 'name' }])).toEqual([])
    expect(toggleColumn('name', [{ column: 'age' }, { column: 'name' }])).toEqual([])
  })
})
