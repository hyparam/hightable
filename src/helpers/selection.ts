import { DataFrame, computeDataIndexes, getRanks, getUnsortedRanks } from './dataframe.js'
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

/**
 * Toggle all rows based on specific data indices (for views like samples where data indices are not contiguous)
 */
export function toggleAllIndices({ ranges, indices }: { ranges: Ranges, indices: number[] }): Ranges {
  if (!areValidRanges(ranges)) {
    throw new Error('Invalid ranges')
  }
  if (!indices || indices.length === 0) {
    return []
  }

  const allSelected = indices.every(index => isSelected({ ranges, index }))

  if (allSelected) {
    let newRanges = ranges
    for (const index of indices) {
      newRanges = toggleIndex({ ranges: newRanges, index })
    }
    return newRanges
  } else {
    let newRanges = ranges
    for (const index of indices) {
      if (!isSelected({ ranges: newRanges, index })) {
        newRanges = toggleIndex({ ranges: newRanges, index })
      }
    }
    return mergeRanges(newRanges.sort((a, b) => a.start - b.start))
  }
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
 * @param {number} params.anchor - The anchor index (inclusive).
 * @param {number} params.index - The index to extend the selection to (inclusive).
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
 * @param {number} params.tableIndex - The index of the row in the table (table domain, sorted row indexes).
 * @param {Selection} params.selection - The current selection state (data domain, row indexes).
 * @param {OrderBy} params.orderBy - The order if the rows are sorted.
 * @param {DataFrame} params.data - The data frame.
 * @param {Map<string,number[]>} params.ranksMap - The map of ranks for each column.
 * @param {function} params.setRanksMap - A function to update the map of column ranks.
 */
export async function toggleRangeInTable({
  tableIndex,
  selection,
  orderBy,
  data,
  ranksMap,
  setRanksMap,
}: { tableIndex: number, selection: Selection, orderBy: OrderBy, data: DataFrame, ranksMap: Map<string, Promise<number[]>>, setRanksMap: (setter: (ranksMap: Map<string, Promise<number[]>>) => Map<string, Promise<number[]>>) => void }): Promise<Selection> {
  // Validate inputs
  if (!isValidIndex(tableIndex)) {
    throw new Error('Invalid index')
  }
  if (!areValidRanges(selection.ranges)) {
    throw new Error('Invalid ranges')
  }
  if (selection.anchor !== undefined && !isValidIndex(selection.anchor)) {
    throw new Error('Invalid anchor')
  }

  // Only check sortable for sorted data
  if (orderBy.length > 0) {
    // Check if orderBy columns exist in data
    for (const { column } of orderBy) {
      if (column && !data.header.includes(column)) {
        throw new Error(`Invalid column: ${column}`)
      }
    }
    if (!data.sortable) {
      throw new Error('Data frame is not sortable')
    }
  }

  // Get the mapping from table positions to data indices
  const dataIndexes = await getDataIndexes({ orderBy, data, ranksMap, setRanksMap })

  // Convert current selection from data indices to table positions
  const tableSelection = convertDataSelectionToTableSelection({ selection, dataIndexes })

  // Perform the range toggle in table space
  const { ranges, anchor } = tableSelection
  const newTableSelection = {
    ranges: extendFromAnchor({ ranges, anchor, index: tableIndex }),
    anchor: tableIndex,
  }

  // Convert back to data indices for storage
  const newDataSelection = convertTableSelectionToDataSelection({ selection: newTableSelection, dataIndexes })
  return newDataSelection
}

/**
 * Get the data indices for the current view order
 */
async function getDataIndexes({
  orderBy,
  data,
  ranksMap,
  setRanksMap,
}: {
  orderBy: OrderBy,
  data: DataFrame,
  ranksMap: Map<string, Promise<number[]>>,
  setRanksMap: (setter: (ranksMap: Map<string, Promise<number[]>>) => Map<string, Promise<number[]>>) => void
}): Promise<number[]> {
  // If no sorting is applied, get the actual data indices from the rows
  if (orderBy.length === 0) {
    const rows = data.rows({ start: 0, end: data.numRows })
    const dataIndexes = await Promise.all(rows.map(row => row.index))
    return dataIndexes
  }

  // For sorted data, use the ranking approach
  const orderByWithDefaultSort = [...orderBy, { column: '', direction: 'ascending' as const }]
  const orderByWithRanksPromises = orderByWithDefaultSort.map(({ column, direction }) => {
    return {
      column,
      direction,
      ranks: ranksMap.get(column) ?? (column === '' ? getUnsortedRanks({ data }) : getRanks({ data, column })),
    }
  })
  if (orderByWithRanksPromises.some(({ column }) => !ranksMap.has(column))) {
    setRanksMap(ranksMap => {
      const nextRanksMap = new Map(ranksMap)
      orderByWithRanksPromises.forEach(({ column, ranks }) => nextRanksMap.set(column, ranks))
      return nextRanksMap
    })
  }
  const orderByWithRanks = await Promise.all(orderByWithRanksPromises.map(async ({ column, direction, ranks }) => ({ column, direction, ranks: await ranks })))
  return computeDataIndexes(orderByWithRanks)
}

/**
 * Convert a selection from data indices to table positions
 * Handles individual single-row ranges and merges them into contiguous table ranges
 */
function convertDataSelectionToTableSelection({ selection, dataIndexes }: { selection: Selection, dataIndexes: number[] }): Selection {
  // Create a map from data index to table index
  const dataToTableIndexMap = new Map<number, number>()
  dataIndexes.forEach((dataIndex, tableIndex) => {
    dataToTableIndexMap.set(dataIndex, tableIndex)
  })

  // Convert each selected data index to its table position
  const tableRanges: Range[] = []
  for (const range of selection.ranges) {
    for (let dataIndex = range.start; dataIndex < range.end; dataIndex++) {
      const tableIndex = dataToTableIndexMap.get(dataIndex)
      if (tableIndex !== undefined) {
        tableRanges.push({ start: tableIndex, end: tableIndex + 1 })
      }
    }
  }

  // Sort and merge adjacent ranges to create contiguous table selections
  const mergedRanges = mergeRanges(tableRanges.sort((a, b) => a.start - b.start))

  const tableAnchor = selection.anchor !== undefined ? dataToTableIndexMap.get(selection.anchor) : undefined
  return { ranges: mergedRanges, anchor: tableAnchor }
}

/**
 * Convert a selection from table positions to data indices
 * Convert table ranges to data index ranges, merging contiguous data indices when possible
 */
function convertTableSelectionToDataSelection({ selection, dataIndexes }: { selection: Selection, dataIndexes: number[] }): Selection {
  // Collect all selected data indices
  const selectedDataIndices: number[] = []
  for (const range of selection.ranges) {
    for (let tableIndex = range.start; tableIndex < range.end; tableIndex++) {
      const dataIndex = dataIndexes[tableIndex]
      if (dataIndex !== undefined) {
        selectedDataIndices.push(dataIndex)
      }
    }
  }

  // Sort data indices and create ranges
  selectedDataIndices.sort((a, b) => a - b)

  const dataRanges: Range[] = []
  if (selectedDataIndices.length > 0) {
    let rangeStart = selectedDataIndices[0] ?? 0
    let rangeEnd = rangeStart + 1

    for (let i = 1; i < selectedDataIndices.length; i++) {
      const current = selectedDataIndices[i] ?? 0
      if (current === rangeEnd) {
        // Extend current range
        rangeEnd = current + 1
      } else {
        // Finish current range and start new one
        dataRanges.push({ start: rangeStart, end: rangeEnd })
        rangeStart = current
        rangeEnd = current + 1
      }
    }

    // Add the last range
    dataRanges.push({ start: rangeStart, end: rangeEnd })
  }

  const dataAnchor = selection.anchor !== undefined ? dataIndexes[selection.anchor] : undefined
  return { ranges: dataRanges, anchor: dataAnchor }
}

/**
 * Merge adjacent and overlapping ranges
 */
function mergeRanges(ranges: Range[]): Range[] {
  if (ranges.length === 0) return []

  const merged: Range[] = []
  let current = ranges[0] ?? { start: 0, end: 0 }

  for (let i = 1; i < ranges.length; i++) {
    const next = ranges[i] ?? { start: 0, end: 0 }
    if (current.end >= next.start) {
      // Merge overlapping or adjacent ranges
      current = { start: current.start, end: Math.max(current.end, next.end) }
    } else {
      merged.push(current)
      current = next
    }
  }

  merged.push(current)
  return merged
}
