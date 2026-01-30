import type { CSSProperties } from 'react'
import { createContext } from 'react'

interface ColumnWidthsContextType {
  /**
   * Get the width of a column by its index.
   *
   * @param columnIndex - The index of the column (0-based).
   * @return The width of the column in pixels, or undefined if not set.
   */
  getWidth?: (columnIndex: number) => number | undefined
  /**
   * Get the style for a column by its index.
   *
   * @param columnIndex - The index of the column (0-based).
   * @return The CSSProperties for the column.
   */
  getStyle?: (columnIndex: number) => CSSProperties
  /**
   * Check if a column has a fixed width.
   *
   * @param columnIndex - The index of the column (0-based).
   * @return true if the column has a fixed width, undefined otherwise.
   */
  getDataFixedWidth?: (columnIndex: number) => true | undefined
  /**
   * Remove the width of a column, allowing it to be measured again.
   *
   * @param columnIndex - The index of the column (0-based).
   */
  releaseWidth?: (columnIndex: number) => void
  /**
   * Set a fixed width for a column, which will be stored and override the automatic width.
   *
   * @param columnIndex - The index of the column (0-based).
   * @param value - The fixed width in pixels.
   */
  setFixedWidth?: (columnIndex: number, value: number) => void
  /**
   * Set the measured width for a column and adjust all measured columns accordingly.
   *
   * @param columnIndex - The index of the column (0-based).
   * @param value - The measured width in pixels.
   */
  setMeasuredWidth?: (columnIndex: number, value: number) => void
}
export const defaultColumnWidthsContext: ColumnWidthsContextType = {}

export const ColumnWidthsContext = createContext<ColumnWidthsContextType>(defaultColumnWidthsContext)
