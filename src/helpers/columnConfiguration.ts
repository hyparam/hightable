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
 * A custom menu item to display in the column menu.
 */
export interface CustomMenuItem {
  /** The label text for the menu item */
  label: string
  /**
   * Callback invoked when the menu item is clicked.
   *
   * @param columnName The name of the column this menu belongs to
   */
  onClick: (columnName: string) => void
}

/**
 * A group of custom menu items to display in the column menu.
 */
export interface CustomMenuGroup {
  /** The title of the menu group */
  title: string
  /** The menu items in this group */
  items: CustomMenuItem[]
}

/**
 * Configuration options for a single column.
 */
export interface ColumnConfig {
  /**
   * A React node or a function that returns a React node to render as the column header.
   */
  headerComponent?: HeaderComponent
  /** Minimum width of the column in pixels */
  minWidth?: number
  /** Whether the column is initially hidden (default false) */
  initiallyHidden?: boolean
  /** Optional CSS class name for the column */
  className?: string
  /**
   * Custom menu groups to display in the column menu for this column.
   *
   * Each group has a title and a list of menu items with labels and onClick callbacks.
   */
  menuGroups?: CustomMenuGroup[]
  // TODO(SL): add more configuration options here:
  // hideable?: boolean;
  // filters: Some filter structure
  // cellRenderer?: (value: unknown, row: Row) => React.ReactNode;
}

/**
 * Configuration options for all columns, keyed by column name.
 */
export type ColumnConfiguration = Record<string, ColumnConfig>
