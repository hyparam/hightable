import React from 'react'

// Single column config
export interface ColumnConfig {
  headerComponent?: React.ReactNode;
  minWidth?: number;
  initiallyHidden?: boolean;
  // hideable?: boolean;
  // filters: Some filter structure
  // cellRenderer?: (value: unknown, row: Row) => React.ReactNode;
}

// Mapped keys : column config
export type ColumnConfiguration = Record<string, ColumnConfig>
