import { DataFrame, getColumnIndex } from './dataframe.js'
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
  if (!isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (!isValidIndex(index)) {
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

export interface SortIndex {
  column: string
  dataIndexes: number[] // TODO(SL) use a typed array?
  tableIndexes: number[] // TODO(SL) use a typed array?
}

/**
 * Get the sort index of the data frame, for a given order.
 *
 * @param {Object} params
 * @param {DataFrame} params.data - The data frame.
 * @param {string} params.column - The column name.
 *
 * @returns {Promise<SortIndex>} A Promise to the sort index.
 */
export async function getSortIndex({ data, column }: { data: DataFrame, column: string }): Promise<SortIndex> {
  // TODO(SL): rename as fetch/compute instead of get, to make it clear it's async
  const { header, numRows } = data
  if (!header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  const dataIndexes = await getColumnIndex({ data, column })
  if (dataIndexes.length !== numRows) {
    throw new Error('Invalid sort index length')
  }
  const tableIndexes = Array(numRows).fill(-1)
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
  return { column, dataIndexes, tableIndexes }
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
 * @param {string} params.column - The column to sort the rows along.
 * @param {DataFrame} params.data - The data frame.
 * @param {SortIndex} params.sortIndex - The sort index of the data frame for the column.
 *
 * @returns {Promise<Selection>} A Promise to the selection of table indexes.
 */
export function toTableSelection({ selection, column, data, sortIndex }: { selection: Selection, column: string, data: DataFrame, sortIndex: SortIndex }): Selection {
  const { header, numRows, sortable } = data
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  if (!header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (column && !sortable) {
    throw new Error('Data frame is not sortable')
  }
  let tableRanges: Ranges = []
  if (ranges.length === 0) {
    // empty selection
    tableRanges = []
  } else if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all rows selected
    tableRanges = [{ start: 0, end: numRows }]
  } else {
    // naive implementation, could be optimized
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
 * @param {string} params.column - The column to sort the rows along.
 * @param {DataFrame} params.data - The data frame.
 * @param {SortIndex} params.sortIndex - The sort index of the data frame for the column.
 *
 * @returns {Promise<Selection>} A Promise to the selection of data indexes.
 */
export function toDataSelection({ selection, column, data, sortIndex }: { selection: Selection, column: string, data: DataFrame, sortIndex: SortIndex }): Selection {
  const { header, numRows, sortable } = data
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

  let dataRanges: Ranges = []
  if (ranges.length === 0) {
    // empty selection
    dataRanges = []
  } else if (ranges.length === 1 && ranges[0].start === 0 && ranges[0].end === numRows) {
    // all data selected
    dataRanges = [{ start: 0, end: numRows }]
  } else {
    // naive implementation, could be optimized
    for (const range of ranges) {
      for (let tableIndex = range.start; tableIndex < range.end; tableIndex++) {
        dataRanges = selectIndex({ ranges: dataRanges, index: getDataIndex({ sortIndex, tableIndex }) })
      }
    }
  }
  const anchorIndex = anchor !== undefined ? getDataIndex({ sortIndex, tableIndex: anchor }) : undefined
  return { ranges: dataRanges, anchor: anchorIndex }
}

/**
 * Compute the new selection state after a click (or shift-click) on the row with the given table index.
 *
 * If useAnchor is false or undefined, the row at the index is toggled.
 *
 * If useAnchor is true, the selection is extended from the anchor to the index. Importantly, this
 * range is done in the visual space of the user, ie: between the rows as they appear in the table.
 * If the rows are sorted, the indexes are converted from data domain to table domain and vice versa,
 * which requires the sort index of the data frame. If not available, it must be computed, which is
 * an async operation that can be expensive.
 *
 * Also, the selection is in the data domain, but the index is passed in the table domain (so that
 * the use can click on the row even if it did not resolve yet). The table index is converted to
 * the data index using the sort index, which, again, might not be available, and require an expensive
 * async operation.
 *
 * TODO(SL): add typescript overloads for the function to make it clear which parameters work together?
 *
 * @param {Object} params
 * @param {number} params.tableIndex - The index of the row in the table (table domain, sorted row indexes).
 * @param {number | undefined} params.dataIndex - The index of the row in the table (data domain, unsorted row indexes).
 * @param {Selection} params.selection - The current selection state (data domain, row indexes).
 * @param {boolean | undefined} params.useAnchor - Whether to use the anchor for shift+click selection.
 * @param {OrderBy | undefined} params.orderBy - The order if the rows are sorted.
 * @param {DataFrame | undefined} params.data - The data frame.
 * @param {SortIndex | undefined} params.sortIndex - The sort index of the data frame for the column.
 * @param {function | undefined} params.setSortIndex - A function to set the sort index of the data frame.
 */
export async function computeNewSelection({
  tableIndex,
  dataIndex,
  useAnchor,
  selection,
  orderBy,
  data,
  sortIndex,
  setSortIndex,
}: { tableIndex: number, dataIndex?: number, selection: Selection, useAnchor?: boolean, orderBy?: OrderBy, data?: DataFrame, sortIndex?: SortIndex, setSortIndex?: (sortIndex: SortIndex) => void }): Promise<Selection> {
  if (!orderBy?.column) {
    // unsorted data: the table and data indexes are the same
    const dataIndex = tableIndex
    return useAnchor ?
      { ranges: extendFromAnchor({ ranges: selection.ranges, anchor: selection.anchor, index: dataIndex }), anchor: selection.anchor } :
      { ranges: toggleIndex({ ranges: selection.ranges, index: dataIndex }), anchor: dataIndex }
  }
  // sorted data: we need to convert between table and data indexes
  const { column } = orderBy
  if (!data) {
    throw new Error('Missing data frame. Cannot compute the new selection.')
  }
  if (!data.header.includes(column)) {
    throw new Error('orderBy column is not in the data frame')
  }
  if (!data.sortable) {
    throw new Error('Data frame is not sortable')
  }
  if (!useAnchor) {
    // no anchor: toggle the row at the index.
    if (dataIndex !== undefined) {
      // Use the data index directly.
      return { ranges: toggleIndex({ ranges: selection.ranges, index: dataIndex }), anchor: dataIndex }
    } else {
      // Convert the table index to the data index, and work in the data domain.
      if (!sortIndex) {
        sortIndex = await getSortIndex({ data, column })
        setSortIndex?.(sortIndex)
      }
      const dataIndex = getDataIndex({ sortIndex, tableIndex }) // <- TODO(SL) getDataIndex({ tableIndex, data, orderBy }) and hide the sort index
      return { ranges: toggleIndex({ ranges: selection.ranges, index: dataIndex }), anchor: dataIndex }
    }
  }
  // extend the selection from the anchor to the index. Convert the selection to table indexes, and work in the table domain
  if (!sortIndex) {
    sortIndex = await getSortIndex({ data, column })
    setSortIndex?.(sortIndex)
  }
  const tableSelection = toTableSelection({ selection, column, data, sortIndex })
  const { ranges, anchor } = tableSelection
  const newTableSelection = { ranges: extendFromAnchor({ ranges, anchor, index: tableIndex }), anchor }
  const newDataSelection = toDataSelection({ selection: newTableSelection, column, data, sortIndex })
  return newDataSelection
}
