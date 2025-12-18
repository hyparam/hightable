import type { ReactNode } from 'react'
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { ColumnParametersContext } from '../contexts/ColumnParametersContext.js'
import { ColumnWidthsContext } from '../contexts/ColumnWidthsContext.js'
import { cellStyle } from '../helpers/width.js'
import { useLocalStorageState } from '../hooks/useLocalStorageState.js'

const defaultMinWidth = 50 // minimum width of a cell in px, used to compute the column widths
const snapDistance = 10 // if a small space remains to the right of the last column after shrinking widths, it's filled by expanding some columns
const maxAdjustmentRatio = 3 // when adjusting, we don't want to shrink a column too much. It's the maximum ratio between the measured width and the adjusted width
const minAdjustedWidth = 150 // when adjusting, we don't want to shrink a column too much. It's the minimum adjusted width
const underfillMargin = 3 // leave 3px unused to avoid showing an unneeded horizontal scrollbar
// TODO(SL): let config.minAdjustedWidth override minAdjustedWidth the same way config.minWidth does for minWidth?

/**
 * The width of a column depends on several factors.
 * Some are given:
 * - the number of columns
 * - the global minimum width (minWidth prop, 50px by default)
 * - the minimum width for a specific column, which overrides the default one (see ColumnParametersContext, optional)
 * - the available width in the table (depends on the component resizes)
 * Others are a state:
 * - the fixed width, when a user resizes the column (note: it is stored in the local storage, and we don't adjust other columns when setting a fixed column)
 * - the measured width (obtained by releasing any restriction on the column and measuring the content width - CSS max-width and other rules apply)
 * - the adjusted width, computed to fill the available width when there are measured columns - not set if the column has a fixed width
 *
 * The width must be at least the minimum width. There is no maximum width.
 *
 * The priority order to decide the width of a column, based on these factors, is:
 * 1. fixed width
 * 2. measured width
 * 3. adjusted width (if the column has been measured, and had to be adjusted)
 * 4. undefined (free width, respects the CSS style rules if any)
 *
 * If any of the factors change, the widths of all the columns are recomputed. Special rules:
 * - if a fixed or measured width does not respect the minimum width anymore, it is deleted.
 * - when a column is resized manually (ie. fixed), the other columns remain unchanged and are not adjusted.
 */

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

  const columnParameters = useContext(ColumnParametersContext)
  const columnMinWidths = useMemo(() => {
    return columnParameters.map(col => col.minWidth)
  }, [columnParameters])

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
    return !Array.isArray(value)
      ? []
      : value.map((element: unknown) => {
          return typeof element === 'number' ? element : undefined
        })
  }
  // Reference to the value of the fixed widths, to use in useEffect without being a dependency
  // (we don't want to adjust other widths when fixed widths change)
  const fixedWidthsRef = useRef<(number | undefined)[]>(fixedWidths)
  const setFixedWidths = useCallback((updater: (widths: (number | undefined)[] | undefined) => (number | undefined)[] | undefined) => {
    _setFixedWidths((widths) => {
      const nextWidths = updater(widths)
      fixedWidthsRef.current = nextWidths ?? []
      return nextWidths
    })
  }, [_setFixedWidths])
  const setFixedWidth = useCallback((columnIndex: number, value: number) => {
    if (!isValidWidth(value) || !isValidIndex(columnIndex)) {
      return
    }
    const clampedValue = Math.max(value, getMinWidth(columnIndex))
    setFixedWidths((widths) => {
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
  const setMeasuredWidth = useCallback((columnIndex: number, value: number) => {
    if (!isValidWidth(value) || !isValidIndex(columnIndex)) {
      return
    }
    // Add 1 pixel to avoid rounding errors that shrink the header text
    const clampedValue = Math.max(value + 1, getMinWidth(columnIndex))
    setMeasuredWidths((widths) => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = clampedValue
      return nextWidths
    })
  }, [isValidIndex, getMinWidth, setMeasuredWidths])
  const checkMeasuredWidths = useCallback(() => {
    setMeasuredWidths(widths => removeBadWidths(widths))
  }, [setMeasuredWidths, removeBadWidths])
  const releaseWidth = useCallback((columnIndex: number) => {
    if (!isValidIndex(columnIndex)) {
      return
    }
    setFixedWidths((widths) => {
      const nextWidths = [...widths ?? []]
      nextWidths[columnIndex] = undefined
      return nextWidths
    })
    setMeasuredWidths((widths) => {
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
    setAdjustedWidths(adjustWidths({ fixedWidths: fixedWidthsRef.current, measuredWidths, maxTotalWidth, numColumns, getMinWidth }))
  }, [numColumns, measuredWidths, maxTotalWidth, getMinWidth, checkFixedWidths, checkMeasuredWidths])

  const getWidth = useCallback((columnIndex: number) => {
    if (isValidIndex(columnIndex)) {
      return fixedWidths?.[columnIndex] ?? adjustedWidths?.[columnIndex] ?? measuredWidths?.[columnIndex]
    }
  }, [isValidIndex, fixedWidths, measuredWidths, adjustedWidths])

  const getStyle = useCallback((columnIndex: number) => {
    return cellStyle(getWidth(columnIndex))
  }, [getWidth])

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

interface WidthGroup {
  width: number // current width
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
  if (maxTotalWidth === undefined) {
    return []
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
  // Target slightly less than available to avoid triggering an unneeded scrollbar
  let excedent = totalWidth - Math.max(0, maxTotalWidth - underfillMargin)

  if (excedent <= 0) {
    return []
  }

  // Group measured column indexes by width in a Map
  const columnsByWidth = new Map<number, { index: number, minWidth: number, adjustedWidth?: number }[]>()
  for (const [index, value] of measuredWidths.entries()) {
    if (value !== undefined) {
      const minWidth = Math.max(
        getMinWidth(index),
        Math.floor(value / maxAdjustmentRatio),
        minAdjustedWidth
      ) // we don't want to shrink a column too much
      if (value < minWidth) {
        // cannot be adjusted, skip
        continue
      }
      const array = columnsByWidth.get(value)
      if (array) {
        array.push({ index, minWidth })
      }
      else {
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
      // Should not happen
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

    // keep only the columns that can still be shrunk (can be empty)
    const remainingColumns = columns.filter(c => c.minWidth < minWidth)

    // re-add the groups
    if (secondLargestGroup?.width === minWidth) {
      // merge
      orderedWidthGroups.push({ width: minWidth, columns: [...secondLargestGroup.columns, ...remainingColumns] })
    }
    else {
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

  // If we exit the loop with excedent < 0, and it's below a threshold, we add it to some columns to snap to the right border
  if (excedent < 0 && excedent > -snapDistance) {
    const availableColumns = adjustedWidths.map((adjustedWidth, index) => {
      const fixedWidth = fixedWidths?.[index]
      const measuredWidth = measuredWidths[index]
      return {
        index,
        fixed: fixedWidth !== undefined,
        width: adjustedWidth ?? measuredWidth,
      }
    }).filter<{ index: number, fixed: boolean, width: number }>(
      // tell typescript that width is defined
      (c): c is { index: number, fixed: boolean, width: number } => !c.fixed && c.width !== undefined
    )
    const numColumns = availableColumns.length
    if (numColumns > 0) {
      const baseIncrement = Math.floor(-excedent / numColumns)
      const rest = -excedent % numColumns
      for (const { index, width } of availableColumns.slice(0, rest)) {
        adjustedWidths[index] = width + baseIncrement + 1
      }
      for (const { index, width } of availableColumns.slice(rest)) {
        adjustedWidths[index] = width + baseIncrement
      }
    }
  }

  return adjustedWidths
}

function isValidWidth(width: unknown): width is number {
  return typeof width === 'number' && Number.isFinite(width) && !isNaN(width) && width >= 0
}
