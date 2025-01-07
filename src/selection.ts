/**
 * A selection is an array of ordered and non-overlapping ranges.
 * The ranges are separated, ie. the end of one range is strictly less than the start of the next range.
 */
export type Selection = Array<Range>

interface Range {
    start: number // inclusive lower limit, positive integer
    end: number // exclusive upper limit, positive integer or Infinity, strictly greater than start (no zero-length ranges).
}

export function isValidIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0
}

export function isValidRange(range: Range): boolean {
  return isValidIndex(range.start)
    && (isValidIndex(range.end) || range.end === Infinity)
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

export function toggleIndex({ selection, index }: {selection: Selection, index: number}): Selection {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }

  if (selection.length === 0) {
    return [{ start: index, end: index + 1 }]
  }

  const newSelection: Selection = []
  let rangeIndex = 0

  // copy the ranges before the index
  while (rangeIndex < selection.length && selection[rangeIndex].end < index) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  if (rangeIndex < selection.length && selection[rangeIndex].start <= index + 1) {
    // the index affects one or two ranges
    const { start, end } = selection[rangeIndex]
    if (start === index + 1) {
      // prepend the range with the index
      newSelection.push({ start: index, end })
    } else if (end === index) {
      // two cases:
      if (rangeIndex + 1 < selection.length && selection[rangeIndex + 1].start === index + 1) {
        // merge with following range
        newSelection.push({ start, end: selection[rangeIndex + 1].end })
        rangeIndex ++ // remove the following range
      } else {
        // extend the range to the index
        newSelection.push({ start, end: index + 1 })
      }
    } else {
      // the index is inside the range, and must be removed
      if (start === index) {
        if (end > index + 1) {
          newSelection.push({ start: index + 1, end })
        }
        // else: the range is removed
      } else if (end === index + 1) {
        newSelection.push({ start, end: index })
      } else {
        newSelection.push({ start, end: index })
        newSelection.push({ start: index + 1, end })
      }
    }
    rangeIndex++
  } else {
    // insert a new range for the index
    newSelection.push({ start: index, end: index + 1 })
  }

  // copy the remaining ranges
  while (rangeIndex < selection.length) {
    newSelection.push({ ...selection[rangeIndex] })
    rangeIndex++
  }

  return newSelection
}

export function isSelected({ selection, index }: {selection: Selection, index: number}): boolean {
  if (!isValidIndex(index)) {
    throw new Error('Invalid index')
  }
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  return selection.some(range => range.start <= index && index < range.end)
}

export function areAllSelected({ selection, length }: { selection: Selection, length?: number }): boolean {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  return selection.length === 1 && selection[0].start === 0 && (selection[0].end === Infinity || selection[0].end === length)
}

export function toggleAll({ selection, length }: {selection: Selection, length ?: number}): Selection {
  if (!isValidSelection(selection)) {
    throw new Error('Invalid selection')
  }
  if (length && !isValidIndex(length)) {
    throw new Error('Invalid length')
  }
  if (areAllSelected({ selection, length })) {
    return []
  }
  return [{ start: 0, end: Infinity }]
}
