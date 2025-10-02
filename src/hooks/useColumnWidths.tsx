import { CSSProperties, ReactNode, createContext, use, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { cellStyle } from '../helpers/width.js'
import { useColumnMinWidths } from './useColumnParameters.js'
import { useLocalStorageState } from './useLocalStorageState.js'

const defaultMinWidth = 50 // minimum width of a cell in px, used to compute the column widths

/**
 * The width of a column depends on several factors. Some are given:
 * - the number of columns
 * - the global minimum width (minWidth prop, 50px by default)
 * - the minimum width for a specific column, which overrides the default one (useColumnParameters context hook, optional)
 * - the available width in the table (depends on the component resizes)
 * And others are a state:
 * - the fixed width, when a user resizes the column (note: it is stored in the local storage)
 * - the measured width (obtained by releasing any restriction on the column and measuring the content width)
 * - the adjusted width, computed to fill the available width when there are measured columns - not set if the column has a fixed width
 *
 * The column width is only measured:
 * - if no fixed width is set
 * - if it can be measured (all the cells in at least one row are rendered)
 * - if it has not been measured yet
 * - it asked so (auto-resize action: measures and sets the fixed width to the measured width)
 *
 * The width must be at least the minimum width. There is no maximum width.
 *
 * The priority order is:
 * 1. fixed width (if any): the CSS width is set to that value
 * 2. adjusted width (if the column has been measured): the CSS width is set to that value
 * 3. undefined: the CSS minimum width is set to the minimum width, but the width is not set (so it can shrink or grow)
 *
 * If any of the factors change, the widths of all the columns are recomputed. Special rule:
 * - if a fixed or measured width does not respect the minimum width anymore, it is deleted.
 * - when a fixed width is set, the other columns are not adjusted, to avoid weird behavior
 */

interface ColumnWidthsContextType {
  getWidth?: (columnIndex: number) => number | undefined
  getStyle?: (columnIndex: number) => CSSProperties
  getDataFixedWidth?: (columnIndex: number) => true | undefined // returns true if the column has a fixed width
  releaseWidth?: (options: { columnIndex: number }) => void // used to remove the widths of a column, so it can be measured again
  setAvailableWidth?: (value: number) => void // used to set the available width in the wrapper element
  setFixedWidth?: (options: { columnIndex: number; value: number }) => void // used to set a fixed width for a column (will be stored and overrides the auto width)
  setMeasuredWidth?: (options: { columnIndex: number; value: number }) => void // used to set the measured width (and adjust all the measured columns)
}

export const ColumnWidthsContext = createContext<ColumnWidthsContextType>({})

interface ColumnWidthsProviderProps {
  localStorageKey?: string // optional key to use for local storage (no local storage if not provided)
  numColumns: number // number of columns (used to initialize the widths array, and compute the widths)
  minWidth?: number // minimum width for a column in pixels
  children: ReactNode
}

export function ColumnWidthsProvider({ children, localStorageKey, numColumns, minWidth }: ColumnWidthsProviderProps) {
  // Number of columns
  if (!Number.isInteger(numColumns) || numColumns < 0) {
    throw new Error(`Invalid numColumns: ${numColumns}. It must be a positive integer.`)
  }
  const isValidIndex = useCallback((index?: number): index is number => {
    return index !== undefined && Number.isInteger(index) && index >= 0 && index < numColumns
  }, [numColumns])

  // Minimum width
  minWidth ??= defaultMinWidth
  if (!isValidWidth(minWidth)) {
    throw new Error(`Invalid minWidth: ${minWidth}. It must be a positive number.`)
  }
  const columnMinWidths = useColumnMinWidths()
  const getMinWidth = useCallback((columnIndex?: number) => {
    return (isValidIndex(columnIndex) ? columnMinWidths[columnIndex] : undefined) ?? minWidth
  }, [isValidIndex, columnMinWidths, minWidth])
  const removeBadWidths = useCallback((widths?: (number | undefined)[]) => {
    if (!widths) {
      return widths
    }
    function isBadWidth(width: number | undefined, index: number) {
      return width !== undefined && (!isValidWidth(width) || width < getMinWidth(index))
    }
    const changed = widths.some((width, index) => isBadWidth(width, index))
    if (!changed) {
      return widths
    }
    return widths.map((width, index) => {
      if (isBadWidth(width, index)) {
        return undefined
      }
      return width
    })
  }, [getMinWidth])

  // Maximum total width
  const [maxTotalWidth, setMaxTotalWidth] = useState<number | undefined>(undefined)
  const setAvailableWidth = useCallback((availableWidth: number) => {
    if (!isValidWidth(availableWidth)) {
      return
    }
    setMaxTotalWidth(availableWidth)
  }, [])

  // Fixed widths
  // The array is uninitialized so that we don't have to know the number of columns in advance
  const [fixedWidths, _setFixedWidths] = useLocalStorageState<(number | undefined)[]>({ key: localStorageKey, parse, stringify: JSON.stringify })
  function parse(json: string): (number | undefined)[] {
    const value: unknown = JSON.parse(json)
    return !Array.isArray(value) ? [] : value.map((element: unknown) => {
      return element
        && typeof element === 'object'
        && 'fixedWidth' in element
        && typeof element.fixedWidth === 'number'
        ? element.fixedWidth
        : undefined
    })
  }
  // Reference to the value of the fixed widths, to use in useEffect without being a dependency
  // (we don't want to adjust other widths when fixed widths change)
  const fixedWidthsRef = useRef<(number | undefined)[]>(fixedWidths)
  const setFixedWidths = useCallback((updater: (widths: (number | undefined)[] | undefined) => (number | undefined)[] | undefined) => {
    _setFixedWidths(widths => {
      const nextWidths = updater(widths)
      fixedWidthsRef.current = nextWidths ?? []
      return nextWidths
    })
  }, [_setFixedWidths])
  const setFixedWidth = useCallback(({ columnIndex, value }: { columnIndex: number; value: number; }) => {
    if (!isValidWidth(value) || !isValidIndex(columnIndex)) {
      return
    }
    const clampedValue = Math.max(value, getMinWidth(columnIndex))
    setFixedWidths(widths => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = clampedValue
      return nextWidths
    })
  }, [isValidIndex, getMinWidth, setFixedWidths])
  const checkFixedWidths = useCallback(() => {
    setFixedWidths(widths => removeBadWidths(widths))
  }, [setFixedWidths, removeBadWidths])
  const getDataFixedWidth = useCallback((columnIndex: number) => {
    if (isValidIndex(columnIndex) && fixedWidths?.[columnIndex] !== undefined) {
      return true
    }
  }, [fixedWidths, isValidIndex])

  // Measured widths
  const [measuredWidths, setMeasuredWidths] = useState<(number | undefined)[]>()
  const setMeasuredWidth = useCallback(({ columnIndex, value }: { columnIndex: number; value: number }) => {
    if (!isValidWidth(value) || !isValidIndex(columnIndex)) {
      return
    }
    const clampedValue = Math.max(value, getMinWidth(columnIndex))
    setMeasuredWidths(widths => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = clampedValue
      return nextWidths
    })
  }, [isValidIndex, getMinWidth, setMeasuredWidths])
  const checkMeasuredWidths = useCallback(() => {
    setMeasuredWidths(widths => removeBadWidths(widths))
  }, [setMeasuredWidths, removeBadWidths])
  const releaseWidth = useCallback(({ columnIndex }: { columnIndex: number }) => {
    if (!isValidIndex(columnIndex)) {
      return
    }
    setFixedWidths(widths => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = undefined
      return nextWidths
    })
    setMeasuredWidths(widths => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = undefined
      return nextWidths
    })
  }, [isValidIndex, setFixedWidths, setMeasuredWidths])

  // Adjusted widths
  const [adjustedWidths, setAdjustedWidths] = useState<(number | undefined)[]>()

  useEffect(() => {
    // update the fixed and measured widths, in case the minimum width changed
    checkFixedWidths()
    checkMeasuredWidths()
    try {
      setAdjustedWidths(adjustWidths({ fixedWidths: fixedWidthsRef.current, measuredWidths, maxTotalWidth, numColumns, getMinWidth }))
    } catch (e) {
      // TODO(SL): remove the try/catch when everything is stable
      console.debug('Error adjusting column widths:', e)
      setAdjustedWidths(undefined)
    }
  }, [numColumns, measuredWidths, maxTotalWidth, getMinWidth, checkFixedWidths, checkMeasuredWidths])

  const getWidth = useCallback((columnIndex: number) => {
    if (isValidIndex(columnIndex)) {
      return fixedWidths?.[columnIndex] ?? adjustedWidths?.[columnIndex] ?? measuredWidths?.[columnIndex]
    }
  }, [isValidIndex, fixedWidths, measuredWidths, adjustedWidths])

  const getStyle = useCallback((columnIndex: number) => {
    return cellStyle(getWidth(columnIndex), getMinWidth(columnIndex))
  }, [getWidth, getMinWidth])

  const value = useMemo(() => {
    return {
      getWidth,
      getStyle,
      getDataFixedWidth,
      releaseWidth,
      setAvailableWidth,
      setFixedWidth,
      setMeasuredWidth,
    }
  }, [getWidth, getStyle, getDataFixedWidth, releaseWidth, setAvailableWidth, setFixedWidth, setMeasuredWidth])

  return (
    <ColumnWidthsContext.Provider value={value}>
      {children}
    </ColumnWidthsContext.Provider>
  )
}

export function useColumnWidths() {
  return useContext(ColumnWidthsContext)
}

interface WidthGroup {
  width: number
  columns: {
    index: number
    minWidth: number
  }[] // columns with this width
}

/**
 * Adjusts the widths of the measured columns to fill the available width.
 *
 * The fixed columns are not changed
 * The measured columns have their width adjusted, between the minimum width and the measured width
 * The other columns are assumed to have the minimum width
 *
 * Throws if any incoherence occurs
 */
function adjustWidths({
  fixedWidths,
  measuredWidths,
  maxTotalWidth,
  getMinWidth,
  numColumns,
}: {
  fixedWidths?: (number | undefined)[]
  measuredWidths?: (number | undefined)[]
  maxTotalWidth?: number
  getMinWidth: (columnIndex?: number) => number
  numColumns: number
}): (number | undefined)[] {
  if (!isValidWidth(maxTotalWidth)) {
    throw new Error(`Invalid maxTotalWidth: ${maxTotalWidth}.`)
  }
  if (!measuredWidths || measuredWidths.every(c => c === undefined)) {
    // no measured columns, nothing to adjust
    return []
  }

  const adjustedWidths: (number | undefined)[] = new Array(numColumns).fill(undefined)

  // Compute the sum of column widths
  // Unknown widths are assumed to be minWidth
  let totalWidth = 0
  for (const columnIndex of adjustedWidths.keys()) {
    const columnWidth = fixedWidths?.[columnIndex] ?? measuredWidths[columnIndex] ?? getMinWidth(columnIndex)
    totalWidth += columnWidth
  }
  let excedent = totalWidth - maxTotalWidth

  // no need to adjust anything if the table fits in the available width
  if (excedent <= 0) {
    return []
  }

  // TODO(SL): re apply these detail
  // const minReducedWidthMargin = 15 // leave some margin for rounding errors
  // const multiplier = numColumns <= 3 ? 1 / numColumns : 0.3 // 30% so that 4 or more columns will overflow
  // const minReducedWidth = clampMin(multiplier * remainingWidth - minReducedWidthMargin)

  // Group measured column indexes by width in a Map
  const columnsByWidth = new Map<number, { index: number; minWidth: number; adjustedWidth?: number }[]>()
  for (const [index, value] of measuredWidths.entries()) {
    if (value !== undefined) {
      const minWidth = getMinWidth(index)
      if (value < minWidth) {
        throw new Error(`Incoherent measured width for column ${index}: ${value} < minWidth ${minWidth}`)
      }
      if (value === minWidth) {
        // cannot be adjusted, skip
        continue
      }
      const array = columnsByWidth.get(value)
      if (array) {
        array.push({ index, minWidth })
      } else {
        columnsByWidth.set(value, [{ index, minWidth }])
      }
    }
  }
  // Convert to width groups ({width, columns}), and sort by width (ascending)
  const orderedWidthGroups = [...columnsByWidth.entries()].map<WidthGroup>(
    ([width, columns]) => ({ width, columns })
  ).sort((a, b) => a.width - b.width)

  // we try to decrease the width of the widest column(s), then the second largest one(s), etc
  // until reaching the target (the max total width).
  // We stop when the total width is below the target width, or when we cannot reduce any more.
  let i = 0
  while (orderedWidthGroups.length > 0 && i < 100 && excedent > 0) { // TODO(SL): remove the limit
    // safeguard against infinite loop
    i++

    // Get the largest width group
    const largestGroup = orderedWidthGroups.pop()
    if (largestGroup === undefined) {
      // should not happen due to the while condition, but it ensures the type
      break
    }
    const { width, columns } = largestGroup
    if (columns.length === 0) {
      throw new Error(`Incoherent width group with no columns: ${width}`)
    }

    // Get the second largest width group (if any)
    const secondLargestGroup = orderedWidthGroups.pop()

    // Compute the minimum width we can reduce to
    const minGroupWidth = Math.max(...columns.map(c => c.minWidth))
    const minWidth = secondLargestGroup === undefined ? minGroupWidth : Math.max(minGroupWidth, secondLargestGroup.width)

    // Compute the ideal new width if we could reduce all columns equally
    const idealNewWidth = Math.ceil(width - excedent / columns.length)

    if (idealNewWidth >= minWidth) {
      // we can reduce to the ideal new width and finish
      for (const column of columns) {
        adjustedWidths[column.index] = idealNewWidth
      }
      excedent -= (width - idealNewWidth) * columns.length
      // All done
      break
    }

    // cannot reduce to the ideal new width, reduce to the minimum width
    for (const column of columns) {
      adjustedWidths[column.index] = minWidth
    }
    excedent -= (width - minWidth) * columns.length

    // keep only the columns that can still be shrinked (can be empty)
    const remainingColumns = columns.filter(c => c.minWidth < minWidth)

    // re-add the groups
    if (secondLargestGroup?.width === minWidth) {
      // merge
      orderedWidthGroups.push({ width: minWidth, columns: [...secondLargestGroup.columns, ...remainingColumns] })
    } else {
      // add the second largest group back (if any)
      if (secondLargestGroup !== undefined) {
        orderedWidthGroups.push(secondLargestGroup)
      }
      // add the remaining columns as a new group (if any)
      if (remainingColumns.length > 0) {
        orderedWidthGroups.push({ width: minWidth, columns: remainingColumns })
      }
    }
  }

  // TODO(SL) if we exit the loop with excedent < 0, and it's below a threshold, we add it to the last adjusted column to avoid a gap

  // // add to last, if missing is less than minReducedWidthMargin
  // const totalWidth = getTotalWidth(orderedWidthGroups)
  // if (lastColumnWidth !== undefined && remainingWidth > 0 && remainingWidth < minReducedWidthMargin && totalWidth < availableWidth) {
  //   lastColumnWidth.width += remainingWidth
  // }

  return adjustedWidths
}

function isValidWidth(width: unknown): width is number {
  return typeof width === 'number' && Number.isFinite(width) && !isNaN(width) && width >= 0
}
