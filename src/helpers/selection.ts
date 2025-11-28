
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

export function getDefaultSelection(): Selection {
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
export function unselectIndex({ ranges, index }: { ranges: Ranges, index: number }): Ranges {
  return unselectRange({ ranges, range: { start: index, end: index + 1 } })
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

export function countSelectedRows({ selection }: { selection: Selection }): number {
  return selection.ranges.reduce((count, range) => count + (range.end - range.start), 0)
}
