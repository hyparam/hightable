import { describe, expect, it } from 'vitest'

import { createGetRowNumber, validateColumn, validateRow } from '../../../src/helpers/dataframe/helpers.js'

describe('createGetRowNumber', () => {
  it('should return the correct row number without orderBy', () => {
    const getRowNumber = createGetRowNumber({ numRows: 5 })
    const result = getRowNumber({ row: 2 })
    expect(result).toEqual({
      value: 2 })
  })
  it('should throw an error if orderBy is provided', () => {
    const getRowNumber = createGetRowNumber({ numRows: 5 })
    expect(() => getRowNumber({ row: 2, orderBy: [{ column: 'col1', direction: 'ascending' }] })).toThrow('orderBy is not supported in this getRowNumber implementation.')
  })
  it('should accept a mutable data object', () => {
    const data = { numRows: 5 }
    const getRowNumber = createGetRowNumber(data)
    expect(() => getRowNumber({ row: 8 })).toThrow('Invalid row index: 8, numRows: 5')
    data.numRows = 10 // mutate the data object
    expect(getRowNumber({ row: 8 })).toEqual({
      value: 8 })
  })
})

describe('validateRow', () => {
  it('should not throw for valid row indices', () => {
    expect(() => {
      validateRow({ row: 0, data: { numRows: 5 } })
    }).not.toThrow()
    expect(() => {
      validateRow({ row: 4, data: { numRows: 5 } })
    }).not.toThrow()
  })
  it('should throw for invalid row indices', () => {
    expect(() => {
      validateRow({ row: -1, data: { numRows: 5 } })
    }).toThrow('Invalid row index: -1, numRows: 5')
    expect(() => {
      validateRow({ row: 5, data: { numRows: 5 } })
    }).toThrow('Invalid row index: 5, numRows: 5')
    expect(() => {
      validateRow({ row: 2.5, data: { numRows: 5 } })
    }).toThrow('Invalid row index: 2.5, numRows: 5')
  })
  it('should accept a mutable data object', () => {
    const data = { numRows: 5 }
    expect(() => {
      validateRow({ row: 6, data })
    }).toThrow('Invalid row index: 6, numRows: 5')
    data.numRows = 10 // mutate the data object
    expect(() => {
      validateRow({ row: 6, data })
    }).not.toThrow()
  })
})

describe('validateColumn', () => {
  const data = {
    columnDescriptors: [
      { name: 'col1', type: 'string', sortable: true },
      { name: 'col2', type: 'number', sortable: false },
      { name: 'col3', type: 'boolean', sortable: true },
    ],
  }

  it('should not throw for valid column names', () => {
    expect(() => {
      validateColumn({ column: 'col1', data })
    }).not.toThrow()
    expect(() => {
      validateColumn({ column: 'col2', data })
    }).not.toThrow()
    expect(() => {
      validateColumn({ column: 'col3', data })
    }).not.toThrow()
  })

  it('should throw for invalid column names', () => {
    expect(() => {
      validateColumn({ column: 'col4', data })
    }).toThrow('Invalid column: col4. Available columns: col1, col2, col3')
    expect(() => {
      validateColumn({ column: '', data })
    }).toThrow('Invalid column: . Available columns: col1, col2, col3')
  })

  it('should accept a mutable data object', () => {
    const mutableData = {
      columnDescriptors: [
        { name: 'col1', type: 'string', sortable: true },
      ],
    }
    expect(() => {
      validateColumn({ column: 'col2', data: mutableData })
    }).toThrow('Invalid column: col2. Available columns: col1')
    mutableData.columnDescriptors.push({ name: 'col2', type: 'number', sortable: false }) // mutate the data object
    expect(() => {
      validateColumn({ column: 'col2', data: mutableData })
    }).not.toThrow()
  })
})
