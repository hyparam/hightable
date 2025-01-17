/**
 * A selection is an array of ordered and non-overlapping ranges.
 * The ranges are separated, ie. the end of one range is strictly less than the start of the next range.
 */
export type Selection = Array<Range>

export interface SelectionAndAnchor {
  selection: Selection // rows selection. The values are indexes of the virtual table (sorted rows), and thus depend on the order.
  anchor?: number // anchor row used as a reference for shift+click selection. It's a virtual table index (sorted), and thus depends on the order.
}

interface Range {
    start: number // inclusive lower limit, positive integer
    end: number // exclusive upper limit, positive integer, strictly greater than start (no zero-length ranges).
}

export function isValidIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0
}

export function isValidRange(range: Range): boolean {
  return isValidIndex(range.start)
    && isValidIndex(range.end)
    && range.end > range.start
}

export function isValidSelection(selection: Selection): boolean {
  if (selection.length === 0) {
    return true
  }
  if (selection.some(range => !isValidRange(range))) {
    return false
  }
  for (let i = 0; i < selection.length - 1; i++) {
    if (selection[i].end >= selection[i + 1].start) {
      return false
    }
  }
  return true
}

export function isSelected({ selection, index }: { selection: Selection, index: number }): boolean {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  return selection.some(range => range.start <= index && index < range.end)
}

export function areAllSelected({ selection, length }: { selection: Selection, length: number }): boolean {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  return selection.length === 1 && selection[0].start === 0 && selection[0].end === length
}

export function toggleAll({ selection, length }: { selection: Selection, length: number }): Selection {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  if (areAllSelected({ selection, length })) {
    return []
  }
  return [{ start: 0, end: length }]
}

export function selectRange({ selection, range }: { selection: Selection, range: Range }): Selection {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  const newSelection: Selection = []
  const { start, end } = range
  let rangeIndex = 0

  // copy the ranges before the new range
  while (rangeIndex < selection.length && selection[rangeIndex].end < start) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  // merge with the new range
  while (rangeIndex < selection.length && selection[rangeIndex].start <= end) {
    range.start = Math.min(range.start, selection[rangeIndex].start)
    range.end = Math.max(range.end, selection[rangeIndex].end)
    rangeIndex++
  }
  newSelection.push(range)

  // copy the remaining ranges
  while (rangeIndex < selection.length) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  return newSelection
}

export function unselectRange({ selection, range }: { selection: Selection, range: Range }): Selection {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  const newSelection: Selection = []
  const { start, end } = range
  let rangeIndex = 0

  // copy the ranges before the new range
  while (rangeIndex < selection.length && selection[rangeIndex].end < start) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  // split the ranges intersecting with the new range
  while (rangeIndex < selection.length && selection[rangeIndex].start < end) {
    if (selection[rangeIndex].start < start) {
      newSelection.push({ start: selection[rangeIndex].start, end: start })
    }
    if (selection[rangeIndex].end > end) {
      newSelection.push({ start: end, end: selection[rangeIndex].end })
    }
    rangeIndex++
  }

  // copy the remaining ranges
  while (rangeIndex < selection.length) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  return newSelection
}

/**
 * Extend selection state from anchor to index (selecting or unselecting the range).
 * Both bounds are inclusive.
 * It will handle the shift+click behavior. anchor is the first index clicked, index is the last index clicked.
 */
export function extendFromAnchor({ selection, anchor, index }: { selection: Selection, anchor?: number, index: number }): Selection {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (anchor === undefined) {
    // no anchor to start the range, no operation
    return selection
  }
  if (!isValidIndex(anchor) || !isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (anchor === index) {
    // no operation
    return selection
  }
  const range = anchor < index ? { start: anchor, end: index + 1 } : { start: index, end: anchor + 1 }
  if (!isValidRange(range)) {
    throw new Error('Invalid range')
  }
  if (isSelected({ selection, index: anchor })) {
    // select the rest of the range
    return selectRange({ selection, range })
  } else {
    // unselect the rest of the range
    return unselectRange({ selection, range })
  }
}

export function toggleIndex({ selection, index }: { selection: Selection, index: number }): Selection {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  const range = { start: index, end: index + 1 }
  return isSelected({ selection, index }) ? unselectRange({ selection, range }) : selectRange({ selection, range })
}
