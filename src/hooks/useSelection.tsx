import { ReactNode, createContext, useCallback, useContext } from 'react'
import { Selection, getDefaultSelection, toggleAll } from '../helpers/selection.js'
import { useInputState } from './useInputState.js'

interface SelectionContextType {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
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

  return (
    <SelectionContext.Provider value={{
      selection: state.value,
      onSelectionChange: state.onChange,
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

type HighTableSelection = SelectionContextType & {
  toggleAllRows?: () => void // callback to call when the user clicks on the "select all" checkbox. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
}

export function useSelection({ numRows }: {numRows: number}): HighTableSelection {
  const { selection, onSelectionChange } = useContext(SelectionContext)

  const getToggleAllRows = useCallback(() => {
    if (!selection || !onSelectionChange) return
    const { ranges } = selection
    return () => {
      onSelectionChange({
        ranges: toggleAll({ ranges, length: numRows }),
        anchor: undefined,
      })
    }
  }, [onSelectionChange, numRows, selection])

  return {
    selection,
    onSelectionChange,
    toggleAllRows: getToggleAllRows(),
  }
}
