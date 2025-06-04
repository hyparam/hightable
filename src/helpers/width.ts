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
 */
export function adjustMeasuredWidths({
  columnWidths,
  availableWidth,
  clamp,
  numColumns,
}: {
  columnWidths: MaybeColumnWidth[]
  availableWidth?: number
  clamp: (width: number) => number
  numColumns: number
}) {
  if (!isValidWidth(availableWidth)) {
    return columnWidths
  }
  const minWidth = clamp(0)
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
    if (columnWidth?.width === undefined) {
      // no info, we assume the width is minWidth
      remainingWidth -= minWidth
      continue
    }
    remainingWidth -= columnWidth.width
  }
  if (columnWidths.length < numColumns) {
    // if there are fewer columns than numColumns, we assume the missing columns have a width of minWidth
    remainingWidth -= (numColumns - columnWidths.length) * minWidth
  }
  const minReducedWidthMargin = 5 // leave some margin for rounding errors
  const multiplier = numColumns <= 3 ? 1 / numColumns : 0.3 // 30% so that 4 or more columns will overflow
  const minReducedWidth = clamp(multiplier * remainingWidth - minReducedWidthMargin)

  // Group measured column indexes by width in a Map
  const indexesByWidth = new Map<number, number[]>()
  for (const [columnIndex, columnWidth] of columnWidths.entries()) {
    if (columnWidth?.measured !== undefined) {
      const { measured } = columnWidth
      const array = indexesByWidth.get(measured)
      if (array) {
        array.push(columnIndex)
      } else {
        indexesByWidth.set(measured, [columnIndex])
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
  //
  // If we succeed in reducing below the target width, we add the remaining space to all the widths equally

  let i = 0
  while (orderedWidthGroups.length > 0 && i < 100) {
    // safeguard against infinite loop
    i++

    const currentWidth = getTotalWidth(orderedWidthGroups)
    if (currentWidth <= remainingWidth) {
      // the current widths are below the target, the loop has ended
      // Increase the widths equally to fill the remaining space
      const delta = Math.floor((remainingWidth - currentWidth) / numMeasuredColumns)
      for (const group of orderedWidthGroups) {
        group.width = clamp(group.width + delta)
      }
      break
    }

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

    // we cannot go below minReducedWidth, we let state as is
    if (last.width <= minReducedWidth) {
      break
    }

    if (previous === undefined || previous.width < minReducedWidth) {
      // decrease the largest width to minReducedWidth
      last.width = minReducedWidth
    } else {
      // decrease the largest width to the second largest width
      // (and merge the states)
      orderedWidthGroups.pop()
      previous.indexes.push(...last.indexes)
    }
  }

  // fill the adjusted widths
  let lastColumnWidth = undefined
  for (const { width, indexes } of orderedWidthGroups) {
    for (const index of indexes) {
      const columnWidth = {
        width: width,
        measured: columnWidths[index]?.measured, // keep the measured width if it exists (it should)
      }
      columnWidths[index] = columnWidth
      lastColumnWidth = columnWidth
      remainingWidth -= width
    }
  }
  // add the missing pixels to the last column
  if (lastColumnWidth !== undefined && remainingWidth > 0) {
    lastColumnWidth.width = clamp(lastColumnWidth.width + remainingWidth)
  }

  return columnWidths
}
