export function cellStyle(width: number | undefined) {
  const px = width ? `${width}px` : undefined
  return { minWidth: px, maxWidth: px }
}

// These two functions can be mocked in unit tests
export function measureOffsetWidth(element: Pick<HTMLElement, 'offsetWidth'>): number {
  // add 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.offsetWidth + 1
}
export function measureClientWidth(element: Pick<HTMLElement, 'clientWidth'>): number {
  // remove 1px to avoid rounding errors, since offsetWidth always returns an integer
  return element.clientWidth - 1
}

interface FixedWidth {
  index: number
  width: number
  status: 'fixed'
 }
interface MeasuredWidth {
  index: number
  width: number
  status: 'measured'
}
interface MissingWidth {
  index: number
  status: 'missing'
}
type ColumnWidth = FixedWidth | MeasuredWidth | MissingWidth
function isFixedWidth(width: ColumnWidth): width is FixedWidth {
  return width.status === 'fixed'
}
function isMeasuredWidth(width: ColumnWidth): width is MeasuredWidth {
  return width.status === 'measured'
}
function isMissingWidth(width: ColumnWidth): width is MissingWidth {
  return width.status === 'missing'
}

function isValidWidth(width: (number | undefined | null)): width is number {
  return width !== undefined && width !== null && !isNaN(width) && width >= 0
}

function toColumnWidths({
  fixedWidths,
  measuredWidths,
  numColumns,
  minWidth,
}: {
  fixedWidths?: (number | undefined | null)[]
  measuredWidths: (number | undefined | null)[]
  numColumns: number
  minWidth: number
}): ColumnWidth[] {
  const columnWidths: ColumnWidth[] = []
  const validMinWidth = Math.floor(isValidWidth(minWidth) ? minWidth : 0)

  for (let index = 0; index < numColumns; index++) {
    const fixedWidth = fixedWidths?.[index]
    const measuredWidth = measuredWidths[index]
    if (isValidWidth(fixedWidth)) {
      columnWidths.push({
        index,
        width: Math.floor(Math.max(fixedWidth, validMinWidth)),
        status: 'fixed',
      })
    } else if (isValidWidth(measuredWidth)) {
      columnWidths.push({
        index,
        width: Math.floor(Math.max(measuredWidth, validMinWidth)),
        status: 'measured',
      })
    } else {
      columnWidths.push({
        index,
        status: 'missing',
      })
    }
  }

  return columnWidths
}

function toFixedWidths(columnWidths: ColumnWidth[]): (number | undefined)[] {
  return columnWidths.map((columnWidth) => {
    return isFixedWidth(columnWidth) ? columnWidth.width : undefined
  })
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

function adjustWidths({
  fixedColumnWidths,
  measuredColumnWidths,
  numColumns,
  minWidth,
  availableWidth,
}: {
  fixedColumnWidths: FixedWidth[]
  measuredColumnWidths: MeasuredWidth[]
  numColumns: number
  minWidth: number
  availableWidth: number
}): (number | undefined)[] {
  // the fixed widths will stay as they are

  // the rest of the widths are measured, and we will adjust them to fill the available space
  const numMeasuredColumns = measuredColumnWidths.length
  if (numMeasuredColumns === 0) {
    throw new Error('No measured columns to adjust widths for.')
  }

  const minReducedWidthMargin = 5 // leave some margin for rounding errors
  const divider = Math.max(Math.min(numColumns, 4), 1) // between 1 and 4 (ie: 25% to 100%)
  const minReducedWidth = Math.max(
    minWidth,
    Math.floor(availableWidth / divider - minReducedWidthMargin)
  )

  // Group column indexes by width in a Map
  const indexesByWidthMap = measuredColumnWidths.reduce<Map<number, number[]>>(
    (acc, cur) => {
      if (acc.has(cur.width)) {
        acc.get(cur.width)?.push(cur.index)
      } else {
        acc.set(cur.width, [cur.index])
      }
      return acc
    },
    new Map<number, number[]>()
  )
  // Convert to width groups ({width, indexes}), and sort by width (ascending)
  const orderedWidthGroups = [...indexesByWidthMap.entries()].map<WidthGroup>(
    ([width, indexes]) => ({ width, indexes })
  ).sort((a, b) => a.width - b.width)

  // we try to reduce the width of the widest column(s), then the second largest one(s), etc
  // until reaching the target (the available width), by:
  // - applying the second largest width to the largest column(s), if possible
  // - else, reducing the largest column(s) to minReducedWidth
  // We stop when the total width is below the target width, or when we cannot reduce any more.
  //
  // If we succeed in reducing below the target width, we add the remaining space to all the widths equally

  const fixedColumnsWidth = fixedColumnWidths.reduce((acc, { width }) => acc + width, 0)
  const targetWidth = availableWidth - fixedColumnsWidth
  let i = 0
  while (orderedWidthGroups.length > 0 && i < 100) {
    // safeguard against infinite loop
    i++

    const currentWidth = getTotalWidth(orderedWidthGroups)
    if (currentWidth <= targetWidth) {
      // the current widths are below the target, the loop has ended
      // Increase the widths equally to fill the remaining space
      const delta = Math.floor((targetWidth - currentWidth) / numMeasuredColumns)
      for (const group of orderedWidthGroups) {
        group.width += delta
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

  // Build the final widths array
  const widths = new Array<number | undefined>(numColumns).fill(undefined)
  // fill with the adjusted widths
  let lastIndex = undefined
  let remainingWidth = targetWidth
  for (const { width, indexes } of orderedWidthGroups) {
    for (const index of indexes) {
      if (widths[index] !== undefined) {
        throw new Error(`Duplicate index ${index} in widths array.`)
      }
      widths[index] = width
      lastIndex = index
      remainingWidth -= width
    }
  }
  // add the missing pixels to the last column
  if (lastIndex !== undefined && remainingWidth > 0) {
    widths[lastIndex] = (widths[lastIndex] ?? 0) + remainingWidth
  }

  // fill with the fixed widths
  for (const { width, index } of fixedColumnWidths) {
    if (widths[index] !== undefined) {
      throw new Error(`Duplicate index ${index} in widths array.`)
    }
    widths[index] = width
  }
  // check that all the widths are defined and valid
  for (let i = 0; i < numColumns; i++) {
    const width = widths[i]
    if (width === undefined) {
      throw new Error(`Width for column ${i} is undefined.`)
    }
    if (!isValidWidth(width)) {
      throw new Error(`Invalid width for column ${i}: ${width}.`)
    }
    if (width < minWidth) {
      throw new Error(`Width for column ${i} is below minWidth: ${width} < ${minWidth}.`)
    }
  }

  return widths
}

export function computeWidths({
  fixedWidths,
  measuredWidths,
  numColumns,
  minWidth,
  availableWidth,
}: {
  fixedWidths?: (number | undefined | null)[]
  measuredWidths: (number | undefined | null)[]
  numColumns: number
  minWidth: number
  availableWidth?: number
}): (number | undefined)[] {
  const columnWidths = toColumnWidths({ fixedWidths, measuredWidths, numColumns, minWidth })

  const fixedColumnWidths = columnWidths.filter(isFixedWidth)
  const measuredColumnWidths = columnWidths.filter(isMeasuredWidth)
  const missingColumnWidths = columnWidths.filter(isMissingWidth)

  if (missingColumnWidths.length > 0 || measuredColumnWidths.length === 0 || !isValidWidth(availableWidth)) {
    // some missing column widths, or all are fixed, or availableWidth is invalid: nothing to adjust
    // Return the fixed widths if any, undefined width for the other columns
    return toFixedWidths(columnWidths)
  }

  return adjustWidths({
    fixedColumnWidths,
    measuredColumnWidths,
    numColumns,
    minWidth,
    availableWidth,
  })
}
