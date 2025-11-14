import React from 'react'

// Single column config
export type HeaderControls = React.ReactNode
export type HeaderComponent = React.ReactNode | ((controls: HeaderControls) => React.ReactNode)

export interface ColumnConfig {
  headerComponent?: HeaderComponent;
  minWidth?: number;
  initiallyHidden?: boolean;
  // hideable?: boolean;
  // filters: Some filter structure
  // cellRenderer?: (value: unknown, row: Row) => React.ReactNode;
}

// Mapped keys : column config
export type ColumnConfiguration = Record<string, ColumnConfig>
