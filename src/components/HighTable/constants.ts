export const rowHeight = 33 // row height px

export const defaultPadding = 20
export const defaultOverscan = 20

const columnWidthsFormatVersion = '2' // increase in case of breaking changes in the column widths format
export const columnWidthsSuffix = `:${columnWidthsFormatVersion}:column:widths` // suffix used to store the column widths in local storage
const columnVisibilityStatesFormatVersion = '2' // increase in case of breaking changes in the column visibility format (changed from array by index to record by name)
export const columnVisibilityStatesSuffix = `:${columnVisibilityStatesFormatVersion}:column:visibility` // suffix used to store the columns visibility in local storage

export const ariaOffset = 2 // 1-based index, +1 for the header
