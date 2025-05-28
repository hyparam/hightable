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

interface FixedInput {
  index: number
  width: number
  status: 'fixed'
 }
interface MeasuredInput {
  index: number
  width: number
  status: 'measured'
}
interface MissingInput {
  index: number
  status: 'missing'
}
type IndexedInput = FixedInput | MeasuredInput | MissingInput
export function isFixedInput(input: IndexedInput): input is FixedInput {
  return input.status === 'fixed'
}
export function isMeasuredInput(input: IndexedInput): input is MeasuredInput {
  return input.status === 'measured'
}
export function isMissingInput(input: IndexedInput): input is MissingInput {
  return input.status === 'missing'
}

function isValidWidth(width: (number | undefined | null)): width is number {
  return width !== undefined && width !== null && !isNaN(width) && width >= 0
}

function toInputs({
  fixedWidths,
  measuredWidths,
  numColumns,
  minWidth,
}: {
  fixedWidths?: (number | undefined | null)[]
  measuredWidths: (number | undefined | null)[]
  numColumns: number
  minWidth: number
}): IndexedInput[] {
  const indexedWidths: IndexedInput[] = []
  const validMinWidth = Math.floor(isValidWidth(minWidth) ? minWidth : 0)

  for (let index = 0; index < numColumns; index++) {
    const fixedWidth = fixedWidths?.[index]
    const measuredWidth = measuredWidths[index]
    if (isValidWidth(fixedWidth)) {
      indexedWidths.push({
        index,
        width: Math.floor(Math.max(fixedWidth, validMinWidth)),
        status: 'fixed',
      })
    } else if (isValidWidth(measuredWidth)) {
      indexedWidths.push({
        index,
        width: Math.floor(Math.max(measuredWidth, validMinWidth)),
        status: 'measured',
      })
    } else {
      indexedWidths.push({
        index,
        status: 'missing',
      })
    }
  }

  return indexedWidths
}

interface FixedWidth {
  width: number
  status: 'fixed'
}
interface AdjustedWidth {
  width: number
  status: 'adjusted'
}
interface UndefinedWidth {
  width: undefined
  status: 'undefined'
}
type ColumnWidth = FixedWidth | AdjustedWidth | UndefinedWidth

function dontAdjustWidths(inputs: IndexedInput[]): ColumnWidth[] {
  return inputs.map((input) => {
    return isFixedInput(input) ? input : { width: undefined, status: 'undefined' }
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
  fixedInputs,
  measuredInputs,
  numColumns,
  minWidth,
  availableWidth,
}: {
  fixedInputs: FixedInput[]
  measuredInputs: MeasuredInput[]
  numColumns: number
  minWidth: number
  availableWidth: number
}): ColumnWidth[] {
  // the fixed widths will stay as they are

  // the rest of the widths are measured, and we will adjust them to fill the available space
  const numMeasuredColumns = measuredInputs.length
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
  const indexesByWidthMap = measuredInputs.reduce<Map<number, number[]>>(
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

  const fixedColumnsWidth = fixedInputs.reduce((acc, { width }) => acc + width, 0)
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
  const columnWidths = new Array<ColumnWidth>(numColumns).fill({ width: undefined, status: 'undefined' })
  // fill with the adjusted widths
  let lastIndex = undefined
  let remainingWidth = targetWidth
  for (const { width, indexes } of orderedWidthGroups) {
    for (const index of indexes) {
      if (columnWidths[index]?.status !== 'undefined') {
        throw new Error(`Duplicate index ${index} in widths array.`)
      }
      columnWidths[index] = {
        width,
        status: 'adjusted',
      }
      lastIndex = index
      remainingWidth -= width
    }
  }
  // add the missing pixels to the last column
  if (lastIndex !== undefined && remainingWidth > 0) {
    const columnWidth = columnWidths[lastIndex]
    if (columnWidth?.width !== undefined) {
      // should always be the case
      columnWidth.width += remainingWidth
    }
  }

  // fill with the fixed widths
  for (const { width, index } of fixedInputs) {
    if (columnWidths[index]?.status !== 'undefined') {
      throw new Error(`Duplicate index ${index} in widths array.`)
    }
    columnWidths[index] = {
      width,
      status: 'fixed',
    }
  }
  // check that all the widths are defined and valid
  for (let i = 0; i < numColumns; i++) {
    const columnWidth = columnWidths[i]
    if (columnWidth === undefined) {
      throw new Error(`Column width for column ${i} is undefined.`)
    }
    if (columnWidth.status === 'undefined') {
      continue // nothing to check for undefined widths
    }
    if (!isValidWidth(columnWidth.width)) {
      throw new Error(`Invalid width for column ${i}: ${columnWidth.width}.`)
    }
    if (columnWidth.width < minWidth) {
      throw new Error(`Width for column ${i} is below minWidth: ${columnWidth.width} < ${minWidth}.`)
    }
  }

  return columnWidths
}

export function computeColumnWidths({
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
}): ColumnWidth[] {
  const inputs = toInputs({ fixedWidths, measuredWidths, numColumns, minWidth })

  const fixedInputs = inputs.filter(isFixedInput)
  const measuredInputs = inputs.filter(isMeasuredInput)
  const missingInputs = inputs.filter(isMissingInput)

  if (measuredInputs.length === 0 || !isValidWidth(availableWidth)) {
    // no measured columns, or availableWidth is invalid: nothing to adjust
    // Return the fixed widths if any, undefined width for the other columns
    return dontAdjustWidths(inputs)
  }

  const validMinWidth = Math.floor(isValidWidth(minWidth) ? minWidth : 0)
  // apply the minWidth to every missing column width in the calculation
  // the missing columns will still be undefined in the final result
  const adjustedAvailableWidth = availableWidth - missingInputs.length * validMinWidth
  return adjustWidths({
    fixedInputs,
    measuredInputs,
    numColumns,
    minWidth: validMinWidth,
    availableWidth: adjustedAvailableWidth,
  })
}
