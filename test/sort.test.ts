import { describe, expect, it } from 'vitest'
import { areEqualOrderBy, partitionOrderBy, toggleColumn } from '../src/sort'

const nameAsc = { column: 'name', direction: 'ascending' as const }
const nameDesc = { column: 'name', direction: 'descending' as const }
const ageAsc = { column: 'age', direction: 'ascending' as const }
const idAsc = { column: 'id', direction: 'ascending' as const }

describe('areEqualOrderBy', () => {
  it('should return true if the order by arrays are equal', () => {
    expect(areEqualOrderBy([], [])).toBe(true)
    expect(areEqualOrderBy([nameAsc], [nameAsc])).toBe(true)
    expect(areEqualOrderBy([nameAsc, ageAsc], [nameAsc, ageAsc])).toBe(true)
  })
  it('should return false if the order by arrays are not equal', () => {
    expect(areEqualOrderBy([nameAsc], [ageAsc])).toBe(false)
    expect(areEqualOrderBy([nameAsc], [nameDesc])).toBe(false)
    expect(areEqualOrderBy([nameAsc, ageAsc], [nameAsc])).toBe(false)
    expect(areEqualOrderBy([nameAsc, ageAsc], [ageAsc, nameAsc])).toBe(false)
  })
})

describe('partitionOrderBy', () => {
  it('should return the prefix, item and suffix of the orderBy array', () => {
    expect(partitionOrderBy([], 'name')).toEqual({ prefix: [], item: undefined, suffix: [] })
    expect(partitionOrderBy([nameAsc], 'name')).toEqual({ prefix: [], item: nameAsc, suffix: [] })
    expect(partitionOrderBy([nameAsc, ageAsc], 'name')).toEqual({ prefix: [], item: nameAsc, suffix: [ageAsc] })
    expect(partitionOrderBy([nameAsc, ageAsc], 'age')).toEqual({ prefix: [nameAsc], item: ageAsc, suffix: [] })
    expect(partitionOrderBy([nameAsc, ageAsc, idAsc], 'age')).toEqual({ prefix: [nameAsc], item: ageAsc, suffix: [idAsc] })
    expect(partitionOrderBy([nameAsc, nameAsc], 'name')).toEqual({ prefix: [], item: nameAsc, suffix: [nameAsc] })
    expect(partitionOrderBy([nameDesc, nameAsc], 'name')).toEqual({ prefix: [], item: nameDesc, suffix: [nameAsc] })
  })
})

describe('toggleColumn', () => {
  it('should return an array with the column if the column is not in the orderBy', () => {
    expect(toggleColumn('name', [])).toEqual([nameAsc])
    expect(toggleColumn('name', [ageAsc])).toEqual([nameAsc])
    expect(toggleColumn('name', [ageAsc, idAsc])).toEqual([nameAsc])
  })
  it('should return an array with the column in descending direction, if the column is in the orderBy with ascending direction', () => {
    expect(toggleColumn('name', [nameAsc])).toEqual([nameDesc])
    expect(toggleColumn('name', [ageAsc, nameAsc])).toEqual([nameDesc])
  })
  it('should return an empty array if the column is in the orderBy with descending direction', () => {
    expect(toggleColumn('name', [nameDesc])).toEqual([])
    expect(toggleColumn('name', [ageAsc, nameDesc])).toEqual([])
  })
})
