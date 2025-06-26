import { DataFrame, fetchIndexes } from './dataframe/index.js'
import { OrderBy } from './sort.js'

/**
 * A selection is modelled as an array of ordered and non-overlapping ranges.
 * The ranges are separated, ie. the end of one range is strictly less than the start of the next range.
 */
interface Range {
  start: number // inclusive lower limit, positive integer
  end: number // exclusive upper limit, positive integer, strictly greater than start (no zero-length ranges).
}
export type Ranges = Range[]

// TODO(SL): rename 'ranges' to 'selection' or something else, that does not disclose the implementation.
// It would make it easier to switch to a Set for example, if needed
// If we rename to Ranges to Selection, then Selection could be renamed to SelectionState to account for the current gesture/anchor?
export interface Selection {
  ranges: Ranges // rows selection.
  anchor?: number // anchor row used as a reference for shift+click selection.
}

export function getDefaultSelection() {
  return { ranges: [], anchor: undefined }
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
    const range = ranges[i]
    const nextRange = ranges[i + 1]
    if (!range || !nextRange || range.end >= nextRange.start) {
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
  return ranges.length === 1 && 0 in ranges && ranges[0].start === 0 && ranges[0].end === length
}

export function toggleAll({ ranges, length }: { ranges: Ranges, length: number }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  if (!length || areAllSelected({ ranges, length })) {
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
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    if (currentRange.end >= start) {
      break
    }
    newRanges.push({ ...currentRange })
    rangeIndex++
  }

  // merge with the new range
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    if (currentRange.start > end) {
      break
    }
    range.start = Math.min(range.start, currentRange.start)
    range.end = Math.max(range.end, currentRange.end)
    rangeIndex++
  }
  newRanges.push(range)

  // copy the remaining ranges
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    newRanges.push({ ...currentRange })
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
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    if (currentRange.end >= start) {
      break
    }
    newRanges.push({ ...currentRange })
    rangeIndex++
  }

  // split the ranges intersecting with the new range
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    if (currentRange.start >= end) {
      break
    }
    if (currentRange.start < start) {
      newRanges.push({ start: currentRange.start, end: start })
    }
    if (currentRange.end > end) {
      newRanges.push({ start: end, end: currentRange.end })
    }
    rangeIndex++
  }

  // copy the remaining ranges
  while (rangeIndex < ranges.length) {
    const currentRange = ranges[rangeIndex]
    if (!currentRange) {
      throw new Error('Invalid range')
    }
    newRanges.push({ ...currentRange })
    rangeIndex++
  }

  return newRanges
}

/**
 * Extend selection state from anchor to index (selecting or unselecting the range).
 * Both bounds are inclusive.
 * It will handle the shift+click behavior. anchor is the first index clicked, index is the last index clicked.
 *
 * If anchor is equal to index, the row is toggled instead.
 *
 * @param {Object} params
 * @param {Ranges} params.ranges - The current selection ranges.
 * @param {number} params.index - The index to extend the selection to (inclusive).
 * @param {number} [params.anchor] - The anchor index (inclusive).
 *
 * @returns {Ranges} The new selection ranges.
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
    // no range to extend, toggle the index
    return toggleIndex({ ranges, index })
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

/**
 * Toggle the selection state of a single index.
 *
 * The anchor is updated to the index.
 *
 * @param {Object} params
 * @param {Selection} params.selection - The current selection state.
 * @param {number} params.index - The index to toggle.
 *
 * @returns {Selection} The new selection state.
 */
export function toggleIndexInSelection({ selection, index }: { selection: Selection, index: number }): Selection {
  return { ranges: toggleIndex({ ranges: selection.ranges, index }), anchor: index }
}

/**
 * Extend the selection state from the anchor to the index (selecting or unselecting the range).
 * Both bounds are inclusive.
 *
 * The anchor is updated to the index.
 *
 * @param {Object} params
 * @param {Selection} params.selection - The current selection state.
 * @param {number} params.index - The index to toggle.
 *
 * @returns {Selection} The new selection state.
 */
export function toggleRangeInSelection({ selection, index }: { selection: Selection, index: number }): Selection {
  return { ranges: extendFromAnchor({ ranges: selection.ranges, anchor: selection.anchor, index }), anchor: index }
}

/**
 * Compute the table indexes from the data indexes.
 *
 * @param {number[]} permutationIndexes - The data frame index of each row of the sorted table (dataIndexes[tableIndex] = dataIndex).
 *
 * @returns {number[]} The index of each row in the sorted table (tableIndexes[dataIndex] = tableIndex).
 */
export function invertPermutationIndexes(permutationIndexes: number[]): number[] {
  const numIndexes = permutationIndexes.length
  const invertedIndexes = Array<number>(numIndexes).fill(-1)
  permutationIndexes.forEach((index, invertedIndex) => {
    if (index < 0 || index >= numIndexes) {
      throw new Error('Invalid index: out of bounds')
    }
    if (!Number.isInteger(index)) {
      throw new Error('Invalid index: not an integer')
    }
    if (invertedIndexes[index] !== -1) {
      throw new Error('Duplicate index')
    }
    invertedIndexes[index] = invertedIndex
  })
  return invertedIndexes
}

/**
 * Get an element from an array, or raise if it's outside of the range.
 *
 * @param {Object} params
 * @param {number} params.index - The index of the element.
 * @param {T[]} params.array - The array of elements (array[index] = element).
 *
 * @returns {T} The element.
 */
export function getElement<T>({ index, array }: {index: number, array: T[]}): T {
  const element = array[index]
  if (element === undefined) {
    throw new Error('Data index not found in the data frame')
  }
  return element
}

/**
 * Convert a selection between two domains, using a permutation array.
 *
 * @param {Object} params
 * @param {Selection} params.selection - A selection of indexes.
 * @param {number[]} params.permutationIndexes - An array that maps every index to another index (permutationIndexes[index] = permutedIndex).
 *
 * @returns {Selection} A selection of permuted indexes.
 */
export function convertSelection({ selection, permutationIndexes }: { selection: Selection, permutationIndexes: number[] }): Selection {
  const numElements = permutationIndexes.length
  const { ranges, anchor } = selection
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (anchor !== undefined && !isValidIndex(anchor)) {
    throw new Error('Invalid anchor')
  }
  let nextRanges: Ranges = []
  if (ranges.length === 0) {
    // empty selection
    nextRanges = []
  } else if (ranges.length === 1 && 0 in ranges && ranges[0].start === 0 && ranges[0].end === numElements) {
    // all rows selected
    nextRanges = [{ start: 0, end: numElements }]
  } else {
    // naive implementation, could be optimized
    for (const range of ranges) {
      const { start, end } = range
      for (let index = start; index < end; index++) {
        nextRanges = selectIndex({ ranges: nextRanges, index: getElement({ index, array: permutationIndexes }) })
      }
    }
  }
  const nextAnchor = anchor !== undefined ? getElement({ index: anchor, array: permutationIndexes }) : undefined
  return { ranges: nextRanges, anchor: nextAnchor }
}

/**
 * Compute the new selection state after a shift-click (range toggle) on the row with the given table index,
 * when the rows are sorted.
 *
 * The selection is extended from the anchor to the index. This
 * range is done in the visual space of the user, ie: between the rows as they appear in the table.
 *
 * The new anchor is the row with the given table index.
 *
 * If the rows are sorted, the indexes are converted from data domain to table domain and vice versa,
 * which requires the sort index of the data frame. If not available, it must be computed, which is
 * an async operation that can be expensive.
 *
 * @param {Object} params
 * @param {number} params.index - The index of the row in the table (table domain, sorted row indexes).
 * @param {Selection} params.selection - The current selection state (data domain, row indexes).
 * @param {OrderBy} params.orderBy - The order if the rows are sorted.
 * @param {DataFrame} params.dataFrame - The data frame.
 * @param {Map<string,number[]>} [params.ranksByColumn] - A map of column names to ranks. Used to cache the ranks for each column to avoid recomputing them on every render.
 * @param {function} [params.setRanks] - A function to set the ranks for a column.
 * @param {number[]} [params.indexes] - Cached indexes of the sorted data frame.
 * @param {function} [params.setIndexes] - A function to set the indexes for an orderBy.
 * @param {AbortSignal} [params.signal] - An optional abort signal to cancel the async operation if needed.
 */
export async function toggleRangeInSortedSelection({
  index,
  selection,
  orderBy,
  dataFrame,
  ranksByColumn,
  setRanks,
  indexes,
  setIndexes,
  signal,
}: { index: number, selection: Selection, orderBy: OrderBy, dataFrame: DataFrame, ranksByColumn?: Map<string, number[]>, setRanks?: ({ column, ranks }: {column: string, ranks: number[]}) => void, indexes?: number[], setIndexes?: ({ orderBy, indexes }: { orderBy: OrderBy, indexes: number[] }) => void, signal?: AbortSignal }): Promise<Selection> {
  // Extend the selection from the anchor to the index with sorted data
  // Convert the indexes to work in the data domain before converting back.
  if (!dataFrame.sortable) {
    throw new Error('Data frame is not sortable')
  }
  const dataIndexes = await fetchIndexes({ orderBy, signal, ranksByColumn, setRanks, indexes, setIndexes, dataFrame })
  // TODO(SL): the permuted indexes could be cached as well
  const tableIndexes = invertPermutationIndexes(dataIndexes)
  const tableSelection = convertSelection({ selection, permutationIndexes: tableIndexes })
  const { ranges, anchor } = tableSelection
  const newAnchor = index
  const newTableSelection = { ranges: extendFromAnchor({ ranges, anchor, index }), anchor: newAnchor }
  const newDataSelection = convertSelection({ selection: newTableSelection, permutationIndexes: dataIndexes })
  return newDataSelection
}
