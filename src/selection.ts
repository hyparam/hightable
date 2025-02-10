import { DataFrame } from './dataframe.js'
import { OrderBy } from './TableHeader.js'

/**
 * A selection is modelled as an array of ordered and non-overlapping ranges.
 * The ranges are separated, ie. the end of one range is strictly less than the start of the next range.
 */
interface Range {
  start: number // inclusive lower limit, positive integer
  end: number // exclusive upper limit, positive integer, strictly greater than start (no zero-length ranges).
}
export type Ranges = Array<Range>

// TODO(SL): rename 'ranges' to 'selection' or something else, that does not disclose the implementation.
// It would make it easier to switch to a Set for example, if needed
// If we rename to Ranges to Selection, then Selection could be renamed to SelectionState to account for the current gesture/anchor?
export interface Selection {
  ranges: Ranges // rows selection.
  anchor?: number // anchor row used as a reference for shift+click selection.
}

export function isValidIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0
}

export function isValidRange(range: Range): boolean {
  return isValidIndex(range.start)
    && isValidIndex(range.end)
    && range.end > range.start
}

export function areValidRanges(ranges: Ranges): boolean {
  if (ranges.length === 0) {
    return true
  }
  if (ranges.some(range => !isValidRange(range))) {
    return false
  }
  for (let i = 0; i < ranges.length - 1; i++) {
    if (ranges[i].end >= ranges[i + 1].start) {
      return false
    }
  }
  return true
}

export function isSelected({ ranges, index }: { ranges: Ranges, index: number }): boolean {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  return ranges.some(range => range.start <= index && index < range.end)
}

export function areAllSelected({ ranges, length }: { ranges: Ranges, length: number }): boolean {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  return ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === length
}

export function toggleAll({ ranges, length }: { ranges: Ranges, length: number }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  if (areAllSelected({ ranges, length })) {
    return []
  }
  return [{ start: 0, end: length }]
}

export function selectRange({ ranges, range }: { ranges: Ranges, range: Range }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  const newRanges: Ranges = []
  const { start, end } = range
  let rangeIndex = 0

  // copy the ranges before the new range
  while (rangeIndex < ranges.length && ranges[rangeIndex].end < start) {
    newRanges.push({ ...ranges[rangeIndex] })
    rangeIndex++
  }

  // merge with the new range
  while (rangeIndex < ranges.length && ranges[rangeIndex].start <= end) {
    range.start = Math.min(range.start, ranges[rangeIndex].start)
    range.end = Math.max(range.end, ranges[rangeIndex].end)
    rangeIndex++
  }
  newRanges.push(range)

  // copy the remaining ranges
  while (rangeIndex < ranges.length) {
    newRanges.push({ ...ranges[rangeIndex] })
    rangeIndex++
  }

  return newRanges
}

export function selectIndex({ ranges, index }: { ranges: Ranges, index: number }): Ranges {
  return selectRange({ ranges, range: { start: index, end: index + 1 } })
}

export function unselectRange({ ranges, range }: { ranges: Ranges, range: Range }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  const newRanges: Ranges = []
  const { start, end } = range
  let rangeIndex = 0

  // copy the ranges before the new range
  while (rangeIndex < ranges.length && ranges[rangeIndex].end < start) {
    newRanges.push({ ...ranges[rangeIndex] })
    rangeIndex++
  }

  // split the ranges intersecting with the new range
  while (rangeIndex < ranges.length && ranges[rangeIndex].start < end) {
    if (ranges[rangeIndex].start < start) {
      newRanges.push({ start: ranges[rangeIndex].start, end: start })
    }
    if (ranges[rangeIndex].end > end) {
      newRanges.push({ start: end, end: ranges[rangeIndex].end })
    }
    rangeIndex++
  }

  // copy the remaining ranges
  while (rangeIndex < ranges.length) {
    newRanges.push({ ...ranges[rangeIndex] })
    rangeIndex++
  }

  return newRanges
}

/**
 * Extend selection state from anchor to index (selecting or unselecting the range).
 * Both bounds are inclusive.
 * It will handle the shift+click behavior. anchor is the first index clicked, index is the last index clicked.
 */
export function extendFromAnchor({ ranges, anchor, index }: { ranges: Ranges, anchor?: number, index: number }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor === undefined) {
    // no anchor to start the range, no operation
    return ranges
  }
  if (!isValidIndex(anchor) || !isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (anchor === index) {
    // no operation
    return ranges
  }
  const range = anchor < index ? { start: anchor, end: index + 1 } : { start: index, end: anchor + 1 }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  if (isSelected({ ranges, index: anchor })) {
    // select the rest of the range
    return selectRange({ ranges, range })
  } else {
    // unselect the rest of the range
    return unselectRange({ ranges, range })
  }
}

export function toggleIndex({ ranges, index }: { ranges: Ranges, index: number }): Ranges {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  const range = { start: index, end: index + 1 }
  return isSelected({ ranges, index }) ? unselectRange({ ranges, range }) : selectRange({ ranges, range })
}

function copy(selection: Selection): Selection {
  return {
    ranges: selection.ranges.map(range => ({ ...range })),
    anchor: selection.anchor,
  }
}

export interface SortIndex {
  orderBy: OrderBy
  dataIndexes: number[] // TODO(SL) use a typed array?
  tableIndexes: number[] // TODO(SL) use a typed array?
}

/**
 * Get the sort index of the data frame, for a given order.
 *
 * @param {Object} params
 * @param {DataFrame} params.data - The data frame.
 * @param {OrderBy} params.orderBy - The order of the rows in the table.
 *
 * @returns {Promise<SortIndex>} A Promise to the sort index.
 */
export async function getSortIndex({ data, orderBy }: { data: DataFrame, orderBy: OrderBy }): Promise<SortIndex> {
  const { header, numRows, rows, sortable } = data
  const { column } = orderBy
  if (!column) {
    const dataIndexes = Array.from({ length: numRows }, (_, i) => i)
    // unsorted data
    return { orderBy, dataIndexes, tableIndexes: dataIndexes }
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }
  if (!header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  const dataIndexes = await Promise.all(rows(0, numRows, column).map(row => row.index))
  const tableIndexes = Array.from({ length: numRows }, (_, i) => -1)
  for (let i = 0; i < numRows; i++) {
    const dataIndex = dataIndexes[i]
    if (dataIndex === undefined) {
      throw new Error('Data index not found in the data frame')
    }
    if (typeof dataIndex !== 'number') {
      throw new Error('Invalid data index: not a number')
    }
    if (dataIndex < 0 || dataIndex >= numRows) {
      throw new Error('Invalid data index: out of bounds')
    }
    if (tableIndexes[dataIndex] !== -1) {
      throw new Error('Duplicate data index')
    }
    tableIndexes[dataIndex] = i
  }
  // check if there are missing indexes
  if (tableIndexes.some(index => index === -1)) {
    throw new Error('Missing indexes in the sort index')
  }
  return { orderBy, dataIndexes, tableIndexes }
}

/**
 * Convert a table index to a data index, using the sort index.
 *
 * @param {Object} params
 * @param {SortIndex} params.sortIndex - The sort index.
 * @param {number} params.tableIndex - The index of the row in the sorted table.
 *
 * @returns {number} The index of the row in the data frame.
 */
export function getDataIndex({ sortIndex, tableIndex }: {sortIndex: SortIndex, tableIndex: number}): number {
  const dataIndex = sortIndex.dataIndexes[tableIndex]
  if (dataIndex === undefined) {
    throw new Error('Table index not found in the data frame')
  }
  return dataIndex
}

/**
 * Convert a data index to a table index, using the sort index.
 *
 * @param {Object} params
 * @param {SortIndex} params.sortIndex - The sort index.
 * @param {number} params.dataIndex - The index of the row in the data frame.
 *
 * @returns {number} The index of the row in the sorted table.
 */
export function getTableIndex({ sortIndex, dataIndex }: {sortIndex: SortIndex, dataIndex: number}): number {
  const tableIndex = sortIndex.tableIndexes[dataIndex]
  if (tableIndex === -1) {
    throw new Error('Data index not found in the data frame')
  }
  return tableIndex
}

/**
 * Convert from a selection of data indexes to a selection of table indexes.
 *
 * Data indexes: the indexes of the selected rows in the data frame.
 * Table indexes: the indexes of the selected rows in the sorted table.
 *
 * @param {Object} params
 * @param {Selection} params.selection - The selection of data indexes.
 * @param {OrderBy | undefined} params.orderBy - The order of the rows in the table.
 * @param {DataFrame} params.data - The data frame.
 *
 * @returns {Promise<Selection>} A Promise to the selection of table indexes.
 */
export async function toTableSelection({ selection, orderBy, data }: { selection: Selection, orderBy: OrderBy | undefined, data: DataFrame }): Promise<Selection> {
  const { header, numRows, sortable, rows } = data
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (!orderBy || !orderBy.column) {
    // unsorted data
    return copy(selection)
  }
  const { column } = orderBy
  if (!header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }
  // naive implementation, should be optimized

  // TODO(SL) enforce at type level that the rows contain the field '__index__'
  // TODO(SL) allow to fetch only the required columns (no need for all the columns)
  const sortIndex = await getSortIndex({ data, orderBy })
  let tableRanges: Ranges = []
  if (ranges.length === 0) {
    // empty selection
    tableRanges = []
  } else if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all rows selected
    tableRanges = [{ start: 0, end: numRows }]
  } else {
    for (const range of ranges) {
      const { start, end } = range
      for (let dataIndex = start; dataIndex < end; dataIndex++) {
        tableRanges = selectIndex({ ranges: tableRanges, index: getTableIndex({ sortIndex, dataIndex }) })
      }
    }
  }
  const anchorTableIndex = anchor !== undefined ? getTableIndex({ sortIndex, dataIndex: anchor }) : undefined
  return { ranges: tableRanges, anchor: anchorTableIndex }
}

/**
 * Convert from a selection of table indexes to a selection of data indexes.
 *
 * Table indexes: the indexes of the selected rows in the sorted table.
 * Data indexes: the indexes of the selected rows in the data frame.
 *
 * @param {Object} params
 * @param {Selection} params.selection - The selection of table indexes.
 * @param {OrderBy | undefined} params.orderBy - The order of the rows in the table.
 * @param {DataFrame} params.data - The data frame.
 *
 * @returns {Promise<Selection>} A Promise to the selection of data indexes.
 */
export async function toDataSelection({ selection, orderBy, data }: { selection: Selection, orderBy: OrderBy | undefined, data: DataFrame }): Promise<Selection> {
  const { header, numRows, sortable, rows } = data
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (!orderBy || !orderBy.column) {
    // unsorted data
    return copy(selection)
  }
  const { column } = orderBy
  if (column && !header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }

  // naive implementation, should be optimized
  let dataRanges: Ranges = []
  const sortIndex = await getSortIndex({ data, orderBy })
  if (ranges.length === 0) {
    // empty selection
    dataRanges = []
  } else if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all data selected
    dataRanges = [{ start: 0, end: numRows }]
  } else {
    for (const range of ranges) {
      for (let tableIndex = range.start; tableIndex < range.end; tableIndex++) {
        dataRanges = selectIndex({ ranges: dataRanges, index: getDataIndex({ sortIndex, tableIndex }) })
      }
    }
  }
  const anchorIndex = anchor !== undefined ? getDataIndex({ sortIndex, tableIndex: anchor }) : undefined
  return { ranges: dataRanges, anchor: anchorIndex }
}
