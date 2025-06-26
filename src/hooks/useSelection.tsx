import { KeyboardEvent, ReactNode, createContext, useCallback, useContext } from 'react'
import { Selection, getDefaultSelection, toggleAll, toggleIndex } from '../helpers/selection.js'
import { useInputState } from './useInputState.js'

interface SelectionContextType {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  onTableKeyDown?: (event: KeyboardEvent, numRows: number) => void // callback to call when a key is pressed on the table. The event is passed as an argument as well as the number of rows
}

export const SelectionContext = createContext<SelectionContextType>({})

interface SelectionProviderProps {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  children: ReactNode
}

export function SelectionProvider({ children, selection, onSelectionChange }: SelectionProviderProps) {
  const state = useInputState<Selection>({
    value: selection,
    onChange: onSelectionChange,
    defaultValue: getDefaultSelection(),
    disabled: selection === undefined && onSelectionChange === undefined,
  })

  const onTableKeyDown = useCallback((event: KeyboardEvent, numRows: number) => {
    // TODO: move numRows to the Provider props?
    const { key, shiftKey } = event

    if (key === 'Escape') {
      // if the user presses Escape, we want to clear the selection
      state.onChange?.(getDefaultSelection())
    } else if (key === 'a' && (event.ctrlKey || event.metaKey)) {
      // if the user presses Ctrl+A, we want to select all rows
      event.preventDefault()
      // only select if selection is enabled, but prevent the default behavior in all cases for consistency
      if (state.value) {
        state.onChange?.({ ranges: toggleAll({ ranges: state.value.ranges, length: numRows }) })
      }
    } else if (key === ' ' && shiftKey) {
      // if the user presses Shift+Space, we want to toggle the current row in the selection
      const { target } = event
      if (!state.value || !state.onChange || !(target instanceof HTMLTableCellElement)) {
        return
      }
      const dataIndex = Number(target.getAttribute('data-rowindex'))
      const isDataCell = target.getAttribute('role') === 'cell' // the row header cells are handled by the RowHeader component
      if (!isDataCell || isNaN(dataIndex) || !Number.isInteger(dataIndex) || dataIndex < 0 || dataIndex >= numRows) {
        return
      }
      event.preventDefault()
      state.onChange({ ranges: toggleIndex({ ranges: state.value.ranges, index: dataIndex }), anchor: dataIndex })
    }
  }, [state])

  return (
    <SelectionContext.Provider value={{
      selection: state.value,
      onSelectionChange: state.onChange,
      onTableKeyDown,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

type HighTableSelection = SelectionContextType & {
  toggleAllRows?: () => void // toggle all rows in the table. undefined if the selection or the onSelectionChange callback are not defined.
}

export function useSelection({ numRows }: {numRows: number}): HighTableSelection {
  const context = useContext(SelectionContext)
  const { selection, onSelectionChange } = context

  const getToggleAllRows = useCallback(() => {
    if (!selection || !onSelectionChange) return
    return () => {
      onSelectionChange({
        ranges: toggleAll({ ranges: selection.ranges, length: numRows }),
        anchor: undefined,
      })
    }
  }, [onSelectionChange, numRows, selection])

  return {
    ...context,
    toggleAllRows: getToggleAllRows(),
  }
}
