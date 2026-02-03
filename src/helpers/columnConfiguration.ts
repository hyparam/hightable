import type { ReactNode } from 'react'

// Single column config
/**
 * A React node representing the header controls (sort arrow, column menu).
 * See ColumnHeader.tsx for the implementation.
 */
export type HeaderControls = ReactNode
/**
 * A function that receives header controls (sort arrow, column menu)
 * and returns a React node to render as the column header.
*/
type HeaderComponentFunction = (controls: HeaderControls) => ReactNode
/**
 * A React node or a function that returns a React node to render as the column header.
 */
export type HeaderComponent = ReactNode | HeaderComponentFunction

/**
 * Configuration options for a single column.
 */
export interface ColumnConfig {
  /**
   * A React node or a function that returns a React node to render as the column header.
   */
  headerComponent?: HeaderComponent
  /** Whether the column is sortable (default false) */
  minWidth?: number
  /** Whether the column is initially hidden (default false) */
  initiallyHidden?: boolean
  /** Optional CSS class name for the column */
  className?: string
  // TODO(SL): add more configuration options here:
  // hideable?: boolean;
  // filters: Some filter structure
  // cellRenderer?: (value: unknown, row: Row) => React.ReactNode;
}

/**
 * Configuration options for all columns, keyed by column name.
 */
export type ColumnConfiguration = Record<string, ColumnConfig>
