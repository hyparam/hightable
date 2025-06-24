import { describe, expect, it } from 'vitest'
import { computeRanks } from '../../../src/helpers/dataframe/sortableDataFrame.js'

describe('computeRanks', () => {
  const data = [
    { id: 3, name: 'Charlie', age: 25 },
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 20 },
    { id: 4, name: 'Dani', age: 20 },
  ]

  it('should return different indexes when all the values are different', () => {
    const columnValues = data.map(({ id }) => id)
    const ranks = computeRanks(columnValues)
    expect(ranks).toEqual([2, 0, 1, 3])
  })

  it('should return equal indexes when the values are the same', () => {
    const columnValues = data.map(({ age }) => age)
    const ranks = computeRanks(columnValues)
    expect(ranks).toEqual([2, 3, 0, 0])
  })
})
