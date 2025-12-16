import { createContext } from 'react'

interface ColumnVisibilityStatesContextType {
  getHideColumn?: (columnName: string) => undefined | (() => void) // returns a function to hide the column, or undefined if the column cannot be hidden
  showAllColumns?: () => void // returns a function to show all columns, or undefined if there are no hidden columns
  isHiddenColumn?: (columnName: string) => boolean // returns true if the column is hidden
}

export const defaultColumnVisibilityStatesContext: ColumnVisibilityStatesContextType = {}

export const ColumnVisibilityStatesContext = createContext<ColumnVisibilityStatesContextType>(defaultColumnVisibilityStatesContext)
