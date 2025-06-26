import { KeyboardEvent, ReactNode, createContext, useCallback, useContext } from 'react'
import { Selection, getDefaultSelection, toggleAll, toggleAllIndices, toggleIndex } from '../helpers/selection.js'
import { useInputState } from './useInputState.js'
import { DataFrame } from '../helpers/dataframe.js'

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
  toggleAllRows?: () => Promise<void> // toggle all rows in the table. undefined if the selection or the onSelectionChange callback are not defined.
}

export function useSelection({ data, numRows }: {data: DataFrame, numRows: number}): HighTableSelection {
  const context = useContext(SelectionContext)
  const { selection, onSelectionChange } = context

  const toggleAllRows = useCallback(async () => {
    if (!selection || !onSelectionChange) return

    const allRows = data.rows({ start: 0, end: numRows })
    const dataIndices: number[] = []

    for (const asyncRow of allRows) {
      if ('resolved' in asyncRow.index && asyncRow.index.resolved !== undefined) {
        dataIndices.push(asyncRow.index.resolved)
      } else {
        const resolvedIndex = await asyncRow.index
        dataIndices.push(resolvedIndex)
      }
    }

    const newRanges = toggleAllIndices({ ranges: selection.ranges, indices: dataIndices })

    onSelectionChange({
      ranges: newRanges,
      anchor: undefined,
    })
  }, [data, numRows, selection, onSelectionChange])

  return {
    ...context,
    toggleAllRows,
  }
}
