import { KeyboardEvent, ReactNode, createContext, useCallback, useContext, useMemo } from 'react'
import { Selection, areAllSelected, getDefaultSelection, isSelected, toggleAll, toggleIndex } from '../helpers/selection.js'
import { useInputState } from './useInputState.js'

interface SelectionContextType {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  onTableKeyDown?: (event: KeyboardEvent) => void // callback to call when a key is pressed on the table.
  toggleAllRows?: () => void // toggle all rows in the table. undefined if the selection or the onSelectionChange callback are not defined.
  allRowsSelected?: boolean // true if all rows are selected, false if none are selected, undefined if the selection is not defined.
  isRowSelected?: (index: number | undefined) => boolean | undefined // function to check if a row is selected. Returns true if the row is selected, false if it is not selected, and undefined if the selection is not defined.
}

export const SelectionContext = createContext<SelectionContextType>({})

interface SelectionProviderProps {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  numRows: number // the number of rows in the table, used to toggle all rows
  children: ReactNode
}

export function SelectionProvider({ children, numRows, selection: inputSelection, onSelectionChange: inputOnSelectionChange }: SelectionProviderProps) {
  const { value: selection, onChange: onSelectionChange } = useInputState<Selection>({
    value: inputSelection,
    onChange: inputOnSelectionChange,
    defaultValue: getDefaultSelection(),
    disabled: inputSelection === undefined && inputOnSelectionChange === undefined,
  })

  const onTableKeyDown = useCallback((event: KeyboardEvent) => {
    const { key, shiftKey } = event

    if (key === 'Escape') {
      // if the user presses Escape, we want to clear the selection
      onSelectionChange?.(getDefaultSelection())
    } else if (key === 'a' && (event.ctrlKey || event.metaKey)) {
      // if the user presses Ctrl+A, we want to select all rows
      event.preventDefault()
      // only select if selection is enabled, but prevent the default behavior in all cases for consistency
      if (selection) {
        onSelectionChange?.({ ranges: toggleAll({ ranges: selection.ranges, length: numRows }) })
      }
    } else if (key === ' ' && shiftKey) {
      // if the user presses Shift+Space, we want to toggle the current row in the selection
      const { target } = event
      if (!selection || !onSelectionChange || !(target instanceof HTMLTableCellElement)) {
        return
      }
      const index = Number(target.getAttribute('data-rownumber'))
      const isDataCell = target.getAttribute('role') === 'cell' // the row header cells are handled by the RowHeader component
      if (!isDataCell || isNaN(index) || !Number.isInteger(index) || index < 0 || index >= numRows) {
        return
      }
      event.preventDefault()
      onSelectionChange({ ranges: toggleIndex({ ranges: selection.ranges, index }), anchor: index })
    }
  }, [selection, onSelectionChange, numRows])

  const toggleAllRows = useMemo(() => {
    if (!selection || !onSelectionChange) return
    return () => {
      onSelectionChange({
        ranges: toggleAll({ ranges: selection.ranges, length: numRows }),
        anchor: undefined,
      })
    }
  }, [onSelectionChange, numRows, selection])

  const allRowsSelected = useMemo(() => {
    if (!selection) return undefined
    return areAllSelected({ ranges: selection.ranges, length: numRows })
  }, [selection, numRows])

  const isRowSelected = useMemo(() => {
    if (!selection) return undefined
    return (index: number | undefined): boolean | undefined => {
      if (index === undefined) return undefined
      return isSelected({ ranges: selection.ranges, index })
    }
  }, [selection])

  return (
    <SelectionContext.Provider value={{
      selection,
      onSelectionChange,
      onTableKeyDown,
      toggleAllRows,
      allRowsSelected,
      isRowSelected,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection(): SelectionContextType {
  return useContext(SelectionContext)
}
