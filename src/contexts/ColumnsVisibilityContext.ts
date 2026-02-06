import { createContext } from 'react'

import type { ColumnParameters } from './ColumnParametersContext'

interface ColumnsVisibilityContextType {
  /** Number of visible columns */
  numberOfVisibleColumns: number
  /** Visible columns parameters */
  visibleColumnsParameters?: ColumnParameters[]
  /**
   * Get a function to hide a column by its name
   *
   * @param columnName - The name of the column to hide
   * @returns A function which hides the column when called, or undefined if the column cannot be hidden
   */
  getHideColumn?: (columnName: string) => undefined | (() => void)
  /**
   * Show all columns
   *
   * If undefined, there are no hidden columns, and thus no action is needed.
   */
  showAllColumns?: () => void
  /**
   * Check if a column is hidden by its name
   *
   * @param columnName - The name of the column to check
   * @returns true if the column is hidden, false otherwise
   */
  isHiddenColumn?: (columnName: string) => boolean // returns true if the column is hidden
}

export const defaultColumnsVisibilityContext: ColumnsVisibilityContextType = {
  numberOfVisibleColumns: 0,
}

export const ColumnsVisibilityContext = createContext<ColumnsVisibilityContextType>(defaultColumnsVisibilityContext)
