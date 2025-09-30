export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}

// These two functions can be mocked in unit tests
export function getOffsetWidth(element: Pick<HTMLElement, 'offsetWidth'>): number {
  // add 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.offsetWidth + 1
}
export function getClientWidth(element: Pick<HTMLElement, 'clientWidth'>): number {
  // remove 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.clientWidth - 1
}

export function isValidWidth(width: unknown): width is number {
  return typeof width === 'number' && Number.isFinite(width) && !isNaN(width) && width >= 0
}

export interface ColumnWidth {
  measured?: number
  width?: number
}
export interface FixedColumnWidth {
  measured?: undefined
  width: number
}

export type MaybeColumnWidth = ColumnWidth | undefined

export function hasFixedWidth(columnWidth: MaybeColumnWidth): columnWidth is FixedColumnWidth {
  return columnWidth?.width !== undefined && columnWidth.measured === undefined
}

interface WidthGroup {
  width: number
  indexes: number[] // index of the columns with this width
}

function getTotalWidth(widthGroups: WidthGroup[]): number {
  let width = 0
  for (const { width: w, indexes } of widthGroups) {
    width += w * indexes.length
  }
  return width
}

/**
 * Adjusts the widths of the measured columns to fill the available width.
 *
 * Only reduce sizes, don't increase them. The measured width is the maximum width.
 */
export function adjustMeasuredWidths({
  columnWidths,
  availableWidth,
  clampMin,
  numColumns,
}: {
  columnWidths: MaybeColumnWidth[]
  availableWidth?: number
  clampMin: (width: number) => number
  numColumns: number
}) {
  if (!isValidWidth(availableWidth)) {
    return columnWidths
  }
  const minWidth = clampMin(0)
  const numMeasuredColumns = columnWidths.filter(c => c?.measured !== undefined).length
  if (numMeasuredColumns === 0) {
    // no measured columns, nothing to adjust
    return columnWidths
  }

  // Compute the remaining space to fill. It can be negative.
  let remainingWidth = availableWidth
  for (const columnWidth of columnWidths) {
    if (columnWidth?.measured !== undefined) {
      // ignore measured columns
      continue
    }
    // use fixed width, or minWidth if width is unknown
    remainingWidth -= columnWidth?.width ?? minWidth
  }
  if (columnWidths.length < numColumns) {
    // if there are fewer columns than numColumns, we assume the missing columns have a width of minWidth
    remainingWidth -= (numColumns - columnWidths.length) * minWidth
  }
  const minReducedWidthMargin = 15 // leave some margin for rounding errors
  const multiplier = numColumns <= 3 ? 1 / numColumns : 0.3 // 30% so that 4 or more columns will overflow
  const minReducedWidth = clampMin(multiplier * remainingWidth - minReducedWidthMargin)

  // Group measured column indexes by width in a Map
  const indexesByWidth = new Map<number, number[]>()
  for (const [columnIndex, columnWidth] of columnWidths.entries()) {
    if (columnWidth?.measured !== undefined) {
      const { measured } = columnWidth
      const clampedMeasured = clampMin(measured)
      const array = indexesByWidth.get(clampedMeasured)
      if (array) {
        array.push(columnIndex)
      } else {
        indexesByWidth.set(clampedMeasured, [columnIndex])
      }
    }
  }
  // Convert to width groups ({width, indexes}), and sort by width (ascending)
  const orderedWidthGroups = [...indexesByWidth.entries()].map<WidthGroup>(
    ([width, indexes]) => ({ width, indexes })
  ).sort((a, b) => a.width - b.width)

  // we try to reduce the width of the widest column(s), then the second largest one(s), etc
  // until reaching the target (the available width), by:
  // - applying the second largest width to the largest column(s), if possible
  // - else, reducing the largest column(s) to minReducedWidth
  // We stop when the total width is below the target width, or when we cannot reduce any more.
  let i = 0
  while (orderedWidthGroups.length > 0 && i < 100) {
    // safeguard against infinite loop
    i++

    // The current width is still above the target width.
    // The priority is to reduce the width of the widest columns (the last item in state)
    // Two options:
    // - keep it as is, if the width is already below minReducedWidth
    // - reduce it to the second largest width, or to minReducedWidth if the second largest width is below that

    const last = orderedWidthGroups.at(-1)
    const previous = orderedWidthGroups.at(-2)

    if (last === undefined) {
      // no more widths to reduce
      break
    }

    const totalWidth = getTotalWidth(orderedWidthGroups)
    const idealNewWidth = clampMin(last.width - (totalWidth - remainingWidth) / last.indexes.length)
    const newWidth = Math.min(last.width, Math.max(idealNewWidth, minReducedWidth, previous?.width ?? 0))

    if (newWidth === previous?.width) {
      // reduce to the second largest width and merge the states
      orderedWidthGroups.pop()
      previous.indexes.push(...last.indexes)
      continue
    }

    // cannot reduce any more
    last.width = newWidth
    break
  }

  // fill the adjusted widths
  let lastColumnWidth = undefined
  for (const { width, indexes } of orderedWidthGroups) {
    for (const index of indexes) {
      const columnWidth = {
        width,
        measured: columnWidths[index]?.measured, // keep the measured width if it exists (it should)
      }
      columnWidths[index] = columnWidth
      lastColumnWidth = columnWidth
      remainingWidth -= width
    }
  }
  // add to last, if missing is less than minReducedWidthMargin
  const totalWidth = getTotalWidth(orderedWidthGroups)
  if (lastColumnWidth !== undefined && remainingWidth > 0 && remainingWidth < minReducedWidthMargin && totalWidth < availableWidth) {
    lastColumnWidth.width += remainingWidth
  }

  return columnWidths
}
