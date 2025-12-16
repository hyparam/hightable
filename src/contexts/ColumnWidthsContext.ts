import { createContext, CSSProperties } from 'react'

// TODO(SL): add documentation for each function
interface ColumnWidthsContextType {
  getWidth?: (columnIndex: number) => number | undefined
  getStyle?: (columnIndex: number) => CSSProperties
  getDataFixedWidth?: (columnIndex: number) => true | undefined // returns true if the column has a fixed width
  releaseWidth?: (columnIndex: number) => void // used to remove the widths of a column, so it can be measured again
  setAvailableWidth?: (value: number) => void // used to set the available width in the wrapper element
  setFixedWidth?: (columnIndex: number, value: number) => void // used to set a fixed width for a column (will be stored and overrides the auto width)
  setMeasuredWidth?: (columnIndex: number, value: number) => void // used to set the measured width (and adjust all the measured columns)
}

export const defaultColumnWidthsContext: ColumnWidthsContextType = {}

export const ColumnWidthsContext = createContext<ColumnWidthsContextType>(defaultColumnWidthsContext)
