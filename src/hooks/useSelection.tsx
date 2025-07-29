import { KeyboardEvent, ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { checkSignal } from '../helpers/dataframe/helpers.js'
import { DataFrame } from '../helpers/dataframe/index.js'
import { Selection, countSelectedRows, getDefaultSelection, isSelected, selectIndex, toggleIndex, toggleIndexInSelection, unselectIndex } from '../helpers/selection.js'
import { OrderBy, serializeOrderBy } from '../helpers/sort.js'
import { useInputState } from './useInputState.js'
import { useOrderBy } from './useOrderBy.js'

interface SelectionContextType {
  selectable?: boolean // true if the selection is defined
  pendingSelectionGesture?: boolean // true if a gesture is pending, meaning that the selection is being modified
  isRowSelected?: ({ rowNumber }: { rowNumber: number | undefined }) => boolean | undefined // function to check if a row is selected. Returns true if the row is selected, false if it is not selected, and undefined if the selection is not defined.
  toggleRowNumber?: ({ rowNumber }: { rowNumber: number }) => void // function to toggle a row in the selection by its row number. undefined if the selection or the onSelectionChange callback are not defined.
  toggleRangeToRowNumber?: ({ row, rowNumber }: { row: number, rowNumber: number }) => void // function to toggle a range to the row number. undefined if the selection or the onSelectionChange callback are not defined.
  onTableKeyDown?: (event: KeyboardEvent) => void // callback to call when a key is pressed on the table.
  toggleAllRows?: () => void // toggle all rows in the table. undefined if the selection or the onSelectionChange callback are not defined.
  allRowsSelected?: boolean // true if all rows are selected, false if none are selected, undefined if the selection is not defined.
}

export const SelectionContext = createContext<SelectionContextType>({})

interface SelectionProviderProps {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  data: DataFrame
  onError?: (error: unknown) => void
  children: ReactNode
}

interface Gesture {
  controller: AbortController // the AbortController used to abort the gesture
}

export function SelectionProvider({ children, data, onError, selection: inputSelection, onSelectionChange: inputOnSelectionChange }: SelectionProviderProps) {
  const { value: selection, onChange: onSelectionChange } = useInputState<Selection>({
    value: inputSelection,
    onChange: inputOnSelectionChange,
    defaultValue: getDefaultSelection(),
    disabled: inputSelection === undefined && inputOnSelectionChange === undefined,
  })

  const [rowByRowNumberAndOrderBy] = useState<Map<string, Map<number, number | undefined>>>(() => new Map())
  const [allRowsSelected, setAllRowsSelected] = useState<boolean | undefined>(areAllSelected({ data, selection }))
  const { orderBy } = useOrderBy()

  const [gesture, setGesture] = useState<Gesture | undefined>(undefined)
  const stopGesture = useCallback(({ gesture }: {gesture: Gesture}) => {
    // Stop the gesture
    gesture.controller.abort()
    // if it's the current gesture, we reset it
    setGesture(currentGesture => {
      if (currentGesture === gesture) {
        // reset the gesture
        return undefined
      }
      // otherwise, we do nothing
      return currentGesture
    })
  }, [setGesture])
  const startGesture = useCallback(() => {
    // start a new gesture, aborting the previous one if it exists
    const nextGesture = { controller: new AbortController() }
    setGesture(previousGesture => {
      if (previousGesture) {
        // abort the previous gesture
        previousGesture.controller.abort()
      }
      return nextGesture
    })
    return nextGesture
  }, [])

  const selectable = useMemo(() => {
    return selection !== undefined
  }, [selection])

  const isRowSelected = useMemo(() => {
    if (!selection) return undefined
    return ({ rowNumber }: {rowNumber:number | undefined}): boolean | undefined => {
      if (rowNumber === undefined) return undefined
      return isSelected({ ranges: selection.ranges, index: rowNumber })
    }
  }, [selection])

  const toggleRowNumber = useMemo(() => {
    if (!selection || !onSelectionChange) {
      return undefined
    }
    return ({ rowNumber }: { rowNumber: number }) => {
      const gesture = startGesture()
      try {
        onSelectionChange(toggleIndexInSelection({ selection, index: rowNumber }))
      } finally {
        stopGesture({ gesture })
      }
    }
  }, [onSelectionChange, selection, startGesture, stopGesture])

  const toggleRangeToRowNumber = useMemo(() => {
    if (!selection || !onSelectionChange) {
      return undefined
    }
    return ({ row, rowNumber }: { row: number, rowNumber: number }) => {
      const gesture = startGesture()
      const { signal } = gesture.controller
      toggleRange({ data, row, rowNumber, selection, orderBy, signal, rowByRowNumberAndOrderBy })
        .finally(() => { stopGesture({ gesture }) })
        .then((newSelection) => { onSelectionChange(newSelection) })
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') {
          // the request was aborted, do nothing
            return
          }
          onError?.(error)
        })
    }
  }, [onSelectionChange, selection, rowByRowNumberAndOrderBy, data, orderBy, startGesture, stopGesture, onError])

  const toggleAllRows = useMemo(() => {
    if (!selection || !onSelectionChange) return
    return () => {
      const gesture = startGesture()
      const { signal } = gesture.controller
      // toggle a range to the row number
      toggleAll({ data, selection, signal })
        .finally(() => { stopGesture({ gesture }) })
        .then((newSelection) => {onSelectionChange(newSelection)})
        .catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') {
            // the request was aborted, do nothing
            return
          }
          onError?.(error)
        })
    }
  }, [onSelectionChange, data, selection, startGesture, stopGesture, onError])

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, shiftKey } = event

    if (key === 'Escape') {
      const gesture = startGesture()
      try {
        // if the user presses Escape, we want to clear the selection
        onSelectionChange?.(getDefaultSelection())
      } finally {
        stopGesture({ gesture })
      }
    } else if (key === 'a' && (event.ctrlKey || event.metaKey)) {
      const gesture = startGesture()
      const { signal } = gesture.controller
      // if the user presses Ctrl+A, we want to select all rows
      event.preventDefault()
      // only select if selection is enabled, but prevent the default behavior in all cases for consistency
      if (selection && onSelectionChange) {
        toggleAll({ data, selection, signal })
          .finally(() => { stopGesture({ gesture }) })
          .then((newSelection) => { onSelectionChange(newSelection) })
          .catch((error: unknown) => {
            if (error instanceof Error && error.name === 'AbortError') {
              // the request was aborted, do nothing
              return
            }
            onError?.(error)
          })
      }
    } else if (key === ' ' && shiftKey) {
      // if the user presses Shift+Space, we want to toggle the current row in the selection
      const { target } = event
      if (!selection || !onSelectionChange || !(target instanceof HTMLTableCellElement)) {
        return
      }
      const index = Number(target.getAttribute('data-rownumber'))
      const isDataCell = target.getAttribute('role') === 'cell' // the row header cells are handled by the RowHeader component
      if (!isDataCell || isNaN(index) || !Number.isInteger(index) || index < 0 || index >= data.numRows) {
        return
      }
      event.preventDefault()
      const gesture = startGesture()
      try {
        onSelectionChange({ ranges: toggleIndex({ ranges: selection.ranges, index }), anchor: index })
      } finally {
        stopGesture({ gesture })
      }
    }
  }, [selection, onSelectionChange, startGesture, stopGesture, data, onError])

  useEffect(() => {
    if (!selection) return undefined
    // it's not really a gesture, but we want it to be aborted when a new gesture starts
    const gesture = startGesture()
    const { signal } = gesture.controller
    fetchAreAllSelected({ data, selection, signal })
      .finally(() => { stopGesture({ gesture }) })
      .then((areAllSelected) => { setAllRowsSelected(areAllSelected) })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name === 'AbortError') {
          // the request was aborted, do nothing
          return
        }
        onError?.(error)
      })
  }, [selection, data, startGesture, stopGesture, onError])

  return (
    <SelectionContext.Provider value={{
      selectable,
      pendingSelectionGesture: gesture !== undefined,
      isRowSelected,
      toggleRowNumber,
      toggleRangeToRowNumber,
      onTableKeyDown,
      toggleAllRows,
      allRowsSelected,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection(): SelectionContextType {
  return useContext(SelectionContext)
}

// fetch the row numbers in the range
async function fetchRowNumbers({ data, rowStart, rowEnd, orderBy, signal }: { data: DataFrame, rowStart: number, rowEnd: number, orderBy?: OrderBy, signal?: AbortSignal }) {
  await data.fetch({ rowStart, rowEnd, orderBy, signal })
  const rowNumbers = Array.from({ length: rowEnd - rowStart }, (_, i) => {
    const row = i + rowStart
    const rowNumber = data.getRowNumber({ row, orderBy })?.value
    if (rowNumber === undefined) {
      throw new Error(`Row number is undefined for row ${row} with orderBy ${JSON.stringify(orderBy ?? [])}`)
    }
    return rowNumber
  })
  return rowNumbers
}

async function fetchRow({ data, rowNumber, orderBy, signal, rowByRowNumberAndOrderBy }: { data: DataFrame, rowNumber: number, orderBy?: OrderBy, signal?: AbortSignal, rowByRowNumberAndOrderBy?: Map<string, Map<number, number | undefined>> }) {
  checkSignal(signal)
  const { numRows } = data
  const orderByKey = serializeOrderBy(orderBy ?? [])
  const cachedMap = rowByRowNumberAndOrderBy?.get(orderByKey)
  if (cachedMap) {
    // already cached, return the row (can be undefined)
    return cachedMap.get(rowNumber)
  }

  // not cached
  const rowByRowNumber = new Map<number, number | undefined>()
  // get all the row numbers in the table
  // TODO(SL): instead of doing everything in one fetch, we could loop, or maybe do a Promise.race between groups of rows
  await data.fetch({ rowStart: 0, rowEnd: numRows, orderBy, signal })
  // fill the Map
  for (let i = 0; i < numRows; i++) {
    const rowNumber = data.getRowNumber({ row: i, orderBy })?.value
    if (rowNumber === undefined) {
      throw new Error(`Row number is undefined for row ${i} with orderBy ${orderByKey}`)
    }
    rowByRowNumber.set(rowNumber, i)
  }
  // update the cache (if any)
  rowByRowNumberAndOrderBy?.set(orderByKey, rowByRowNumber)
  // lookup again (undefined is a valid value)
  return rowByRowNumber.get(rowNumber)
}

async function toggleRange({ data, row, rowNumber, selection, orderBy, signal, rowByRowNumberAndOrderBy }: { data: DataFrame, row: number, rowNumber: number, selection: Selection, orderBy?: OrderBy, signal?: AbortSignal, rowByRowNumberAndOrderBy?: Map<string, Map<number, number | undefined>> }): Promise<Selection> {
  const { anchor } = selection
  if (anchor === undefined || anchor === rowNumber) {
    // toggle the row without the anchor
    return toggleIndexInSelection({ selection, index: rowNumber })
  }

  // try to get the tableIndex of the anchor
  const anchorRow: number | undefined = await fetchRow({ data, rowNumber: anchor, orderBy, signal, rowByRowNumberAndOrderBy })

  if (anchorRow === undefined || anchorRow === row) {
    // Note: anchorRow should be different from row at that point because we already checked anchor === rowNumber above
    // toggle the row without the anchor
    return toggleIndexInSelection({ selection, index: rowNumber })
  }
  // else: toggle the range between the anchor and the current row
  const [rowStart, rowEnd] = anchorRow < row ?
    [anchorRow + 1, row + 1] :
    [row, anchorRow]
  const rowNumbers = await fetchRowNumbers({ data, rowStart, rowEnd, orderBy, signal })

  let { ranges } = selection
  const newAnchor = data.getRowNumber({ row, orderBy })?.value
  if (newAnchor === undefined) {
    // should never happen
    throw new Error(`Row number for row ${row} not found in orderBy ${serializeOrderBy(orderBy ?? [])}`)
  }
  // check if the anchor is already selected
  const isAnchorSelected = isSelected({ ranges, index: anchor })
  for (const rowNumber of rowNumbers) {
    // TODO(SL): sort the rowNumbers, group by consecutive indexes and use un/selectRange instead
    // select or unselect all the rows between the anchor and the current row, depending if the anchor is selected
    ranges = isAnchorSelected ? selectIndex({ ranges, index: rowNumber }) : unselectIndex({ ranges, index: rowNumber })
  }
  return { ranges, anchor: newAnchor }
}

async function toggleAll({ data, selection, signal }: { data: DataFrame, selection: Selection, signal?: AbortSignal }): Promise<Selection> {
  // check if all the rows are already selected
  const areAllSelected = await fetchAreAllSelected({ data, selection, signal })
  const rowNumbers = await fetchRowNumbers({ data, rowStart: 0, rowEnd: data.numRows, signal })

  let { ranges } = selection
  for (const rowNumber of rowNumbers) {
    // TODO(SL): sort the rowNumbers, group by consecutive indexes and use un/selectRange instead
    ranges = areAllSelected ? unselectIndex({ ranges, index: rowNumber }) : selectIndex({ ranges, index: rowNumber })
  }
  // no anchor is set when toggling all rows
  return { ranges }
}

function areAllSelected({ data, selection }: { data: DataFrame, selection?: Selection }): false | undefined {
  if (!selection) {
    return false
  }
  if (data.numRows === 0) {
    return false
  }
  // optimization: if the selection contains less than the total number of rows, we can assume not all rows are selected
  if (countSelectedRows({ selection }) < data.numRows) {
    return false
  }
  // the opposite is not true, because a rows selection can be shared between dataframes (think a dataframe and a sampled dataframe)

  // At that point, we don't know: it requires an async operation to check if all rows are selected
}

async function fetchAreAllSelected({ data, selection, signal }: { data: DataFrame, selection: Selection, signal?: AbortSignal }): Promise<boolean> {
  const syncAnswer = areAllSelected({ data, selection })
  if (syncAnswer !== undefined) {
    return syncAnswer
  }
  // fetch all the row numbers in the table
  const rowNumbers = await fetchRowNumbers({ data, rowStart: 0, rowEnd: data.numRows, signal })
  // check if all these row numbers are in the selection
  return rowNumbers.length > 0 && rowNumbers.every(rowNumber => isSelected({ ranges: selection.ranges, index: rowNumber }))
}
