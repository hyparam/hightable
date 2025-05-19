import { ReactNode, createContext, useContext } from 'react'
import { Selection, getDefaultSelection } from '../helpers/selection.js'
import { useInputState } from './useInputState.js'

interface SelectionContextType {
  selection?: Selection // selection and anchor rows, expressed as data indexes (not as indexes in the table). If undefined, the selection is hidden and the interactions are disabled.
  onSelectionChange?: (selection: Selection) => void // callback to call when a user interaction changes the selection. The selection is expressed as data indexes (not as indexes in the table). The interactions are disabled if undefined.
  resetSelection?: () => void
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
      resetSelection: () => state.resetTo?.(getDefaultSelection()),
    }}>
      {children}
    </SelectionContext.Provider>
  )
}

export function useSelection() {
  return useContext(SelectionContext)
}
