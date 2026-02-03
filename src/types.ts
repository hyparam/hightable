import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

import type { CellContentProps } from './components/Cell/Cell.js'
import type { ColumnConfiguration } from './helpers/columnConfiguration.js'
import type { DataFrame } from './helpers/dataframe/index.js'
import type { Selection } from './helpers/selection.js'
import type { OrderBy } from './helpers/sort.js'
import type { MaybeHiddenColumn } from './providers/ColumnVisibilityStatesProvider.js'

// TODO(SL): update orderBy, onOrderByChange, selection, onSelectionChange docstrings to reflect the reality

export interface HighTableProps {
  /** Data provider for the table */
  data: DataFrame

  // optional props

  /** Key used to persist column widths in localStorage. If undefined, the column widths are not persisted. It is expected to be unique for each table. */
  cacheKey?: string
  /** Additional CSS class names for the component */
  className?: string
  /** User-provided configuration for the columns, keyed by column name */
  columnConfiguration?: ColumnConfiguration
  /** Whether to focus the first cell on mount, or when a new data frame is passed. Defaults to true. */
  focus?: boolean
  /** The maximum number of rows to display (for row headers). Useful for filtered data. If undefined, the number of rows in the data frame is applied. */
  maxRowNumber?: number
  /** Number of rows per page for keyboard navigation (default 20) */
  numRowsPerPage?: number
  /** Order used to fetch the rows. If undefined, the table is unordered, the sort controls are hidden and the interactions are disabled. Pass [] to fetch the rows in the original order. */
  orderBy?: OrderBy
  /** Number of rows to fetch beyond the visible table cells. Defaults to 20. */
  overscan?: number
  /** Number of rows to render beyond the visible table cells. Defaults to 20. */
  padding?: number
  /** Selection and anchor rows, expressed as data indexes (0 = first row in the data frame). If undefined, the selection is hidden and the interactions are disabled. */
  selection?: Selection
  /** Use the default styles? (default true) */
  styled?: boolean

  // optional function props

  /**
   * Optional function called whenever the set of hidden columns changes.
   *
   * @param columns A record of column visibility states keyed by column name
   */
  onColumnsVisibilityChange?: (columns: Record<string, MaybeHiddenColumn>) => void
  /**
   * Optional function called on double click of a cell.
   *
   * @param event The mouse event
   * @param col The column index of the cell (0 = first column)
   * @param row The row index of the cell (0 = first row)
   */
  // TODO(SL): replace col: number with col: string?
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  /**
   * Optional function called when an error occurs, generally from a catch block.
   *
   * It is generally an Error object, but for type safety, it is typed as unknown.
   *
   * Ignored if not set.
   *
   * @param error The error that occurred
   */
  onError?: (error: unknown) => void
  /**
   * Optional function called on key down of a cell.
   *
   * For accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though.
   *
   * @param event The keyboard event
   * @param col The column index of the cell (0 = first column)
   * @param row The row index of the cell (0 = first row)
   */
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void
  /**
   * Optional function called on mouse down of a cell.
   *
   * @param event The mouse event
   * @param col The column index of the cell (0 = first column)
   * @param row The row index of the cell (0 = first row)
   */
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  /**
   * Optional function called when a user interaction changes the order.
   *
   * If undefined, the component order is read-only if controlled (orderBy is set), or disabled if not (or if the data cannot be sorted).
   *
   * @param orderBy The new orderBy
   */
  onOrderByChange?: (orderBy: OrderBy) => void
  /**
   * Optional function called when a user interaction changes the selection.
   *
   * The selection is expressed as data indexes (0 = first row in the data frame). The interactions are disabled if undefined.
   *
   * @param selection The new selection
   */
  onSelectionChange?: (selection: Selection) => void
  /**
   * Optional custom cell content component.
   *
   * If not provided, the default CellContent component will be used.
   *
   * @param props The cell content props
   */
  renderCellContent?: (props: CellContentProps) => ReactNode
  /**
   * Optional function to stringify cell values for rendering, copy/paste and export.
   *
   * @param value The cell value
   * @returns The stringified value, or undefined to use the default stringification
   */
  stringify?: (value: unknown) => string | undefined
}
