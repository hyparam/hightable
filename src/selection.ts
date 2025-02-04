import { DataFrame, asyncRows } from './dataframe.js'
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
  const { column } = orderBy ?? {}
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (column && !header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }
  if (ranges.length === 0) {
    // empty selection
    return copy(selection)
  }
  if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all data selected
    return copy(selection)
  }
  if (!column) {
    // unsorted data
    return copy(selection)
  }
  // naive implementation, should be optimized
  const tableRanges: Ranges = []
  for (const range of ranges) {
    const { start, end } = range
    // TODO(SL) enforce at type level that the rows contain the field '__index__'
    // TODO(SL) allow to fetch only the required columns (no need for all the columns)
    const sortedRows = rows(start, end, column)
    const sortedAsyncRows = asyncRows(sortedRows, numRows, header)
    const sortedIndexes = await Promise.all(sortedAsyncRows.map(row => row.__index__))
    for (const sortedIndex of sortedIndexes) {
      if (sortedIndex !== undefined) {
        // TODO(SL) optimize the creation (or use a Set instead)
        selectIndex({ ranges: tableRanges, index: sortedIndex })
      }
      // if no __index__ field, ignore the row
    }
  }
  const anchorRow = anchor !== undefined ? await rows(anchor, anchor + 1) : undefined
  const anchorIndex = anchorRow ? await anchorRow[0].__index__ : undefined
  return { ranges: tableRanges, anchor: anchorIndex }
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
  const { column } = orderBy ?? {}
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (column && !header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }
  if (ranges.length === 0) {
    // empty selection
    return copy(selection)
  }
  if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all data selected
    return copy(selection)
  }
  if (!column) {
    // unsorted data
    return copy(selection)
  }
  // naive implementation, should be optimized
  const dataRanges: Ranges = []
  // the most naive way:
  // - create the list of all the sorted indexes (tableIndex -> dataIndex) - it can be too big for the memory, and we should cache it
  // - add each index, one after the other
  const sortedRows = rows(0, data.numRows, column)
  const sortedAsyncRows = asyncRows(sortedRows, numRows, header)
  const sortedIndexes = await Promise.all(sortedAsyncRows.map(row => row.__index__))
  for (const range of ranges) {
    for (let i = range.start; i < range.end; i++) {
      if (sortedIndexes[i] !== undefined) {
        selectIndex({ ranges: dataRanges, index: sortedIndexes[i] })
      }
    }
  }
  const anchorIndex = anchor !== undefined ? sortedIndexes[anchor] : undefined
  return { ranges: dataRanges, anchor: anchorIndex }
}
