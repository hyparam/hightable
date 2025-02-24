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
