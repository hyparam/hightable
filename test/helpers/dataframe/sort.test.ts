import { describe, expect, it } from 'vitest'

import { arrayDataFrame } from '../../../src/helpers/dataframe/array.js'
import { sortableDataFrame } from '../../../src/helpers/dataframe/sort.js'

function createTestData() {
  return [
    { id: 1, name: 'Alice', age: 30 },
    { id: 2, name: 'Bob', age: 25 },
    { id: 3, name: 'Charlie', age: 35 },
  ]
}

describe('sortableDataFrame', () => {
  it('should sort data correctly', async () => {
    const df = sortableDataFrame(arrayDataFrame(createTestData()))
    const orderBy = [{ column: 'age', direction: 'ascending' as const }]
    await df.fetch?.({ rowStart: 0, rowEnd: df.numRows, orderBy })
    expect(df.getRowNumber({ row: 0, orderBy })?.value).toBe(1) // Bob
    expect(df.getRowNumber({ row: 1, orderBy })?.value).toBe(0) // Alice
    expect(df.getRowNumber({ row: 2, orderBy })?.value).toBe(2) // Charlie
    expect(df.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Bob')
    expect(df.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Alice')
    expect(df.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Charlie')
  })

  it('should keep the data sorted when the underlying data changes', async () => {
    const array = createTestData()
    const data = arrayDataFrame(array)
    const sortedData = sortableDataFrame(data)
    const orderBy = [{ column: 'age', direction: 'ascending' as const }]
    await sortedData.fetch?.({ rowStart: 0, rowEnd: sortedData.numRows, orderBy })
    expect(sortedData.getRowNumber({ row: 0, orderBy })?.value).toBe(1) // Bob

    await new Promise<void>((done) => {
      // listen to the numrowschange event, to check the new data is sorted
      sortedData.eventTarget?.addEventListener('numrowschange', () => {
        expect(sortedData.getRowNumber({ row: 0, orderBy })?.value).toBe(3) // Dave
        expect(sortedData.getRowNumber({ row: 1, orderBy })?.value).toBe(1) // Bob
        expect(sortedData.getRowNumber({ row: 2, orderBy })?.value).toBe(0) // Alice
        expect(sortedData.getCell({ row: 0, column: 'name', orderBy })?.value).toBe('Dave')
        expect(sortedData.getCell({ row: 1, column: 'name', orderBy })?.value).toBe('Bob')
        expect(sortedData.getCell({ row: 2, column: 'name', orderBy })?.value).toBe('Alice')
        done()
      })

      // Modify the underlying data
      data._array.push({ id: 4, name: 'Dave', age: 20 })
    })
  })
})
