import { describe, expect, it } from 'vitest'
import { areEqualOrderBy, computeRanks, partitionOrderBy, toggleColumn, validateOrderBy } from '../../src/helpers/sort.js'

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
  it('should return an array with the column as first element if the column is not in the orderBy', () => {
    expect(toggleColumn('name', [])).toEqual([nameAsc])
    expect(toggleColumn('name', [ageAsc])).toEqual([nameAsc, ageAsc])
    expect(toggleColumn('name', [ageAsc, idAsc])).toEqual([nameAsc, ageAsc, idAsc])
  })
  it('should return an array with the column as first element if the column is not the first element in the orderBy', () => {
    expect(toggleColumn('name', [ageAsc, nameAsc])).toEqual([nameAsc, ageAsc])
    expect(toggleColumn('name', [ageAsc, nameDesc])).toEqual([nameAsc, ageAsc])
    expect(toggleColumn('name', [ageAsc, nameDesc, nameDesc])).toEqual([nameAsc, ageAsc, nameDesc])
  })
  it('should return an array with the column in descending direction, if the column is the first element in the orderBy with ascending direction', () => {
    expect(toggleColumn('name', [nameAsc])).toEqual([nameDesc])
    expect(toggleColumn('name', [nameAsc, ageAsc])).toEqual([nameDesc, ageAsc])
    expect(toggleColumn('name', [nameAsc, nameDesc])).toEqual([nameDesc, nameDesc])
  })
  it('should remove the first element if the column is the first element in the orderBy with descending direction', () => {
    expect(toggleColumn('name', [nameDesc])).toEqual([])
    expect(toggleColumn('name', [nameDesc, ageAsc])).toEqual([ageAsc])
    expect(toggleColumn('name', [nameDesc, nameAsc])).toEqual([nameAsc])
  })
})

describe('validateOrderBy', () => {
  const sortableColumns = new Set(['name', 'age'])
  it('should not throw if the orderBy is valid', () => {
    expect(() => { validateOrderBy({ sortableColumns, orderBy: [nameAsc, ageAsc] }) }).not.toThrow()
    expect(() => { validateOrderBy({ sortableColumns, orderBy: [nameDesc, ageAsc] }) }).not.toThrow()
  })
  it('should throw if the orderBy contains an invalid column', () => {
    expect(() => { validateOrderBy({ sortableColumns, orderBy: [idAsc] }) }).toThrow('Unsortable columns in orderBy field: id')
    expect(() => { validateOrderBy({ sortableColumns: new Set(['age']), orderBy: [nameAsc, idAsc] }) }).toThrow('Unsortable columns in orderBy field: name, id')
  })
})

describe('computeRanks', () => {
  it('should return different indexes when all the values are different', () => {
    const values = [3, 1, 2, 4 ]
    const ranks = computeRanks(values)
    expect(ranks).toEqual([2, 0, 1, 3])
  })

  it('should return equal indexes when the values are the same', () => {
    const values = [2, 3, 1, 1]
    const ranks = computeRanks(values)
    expect(ranks).toEqual([2, 3, 0, 0])
  })

  it('should handle strings', () => {
    const values = ['b', 'c', 'a', 'a']
    const ranks = computeRanks(values)
    expect(ranks).toEqual([2, 3, 0, 0])
  })
})
