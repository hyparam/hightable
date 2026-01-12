export const rowHeight = 33 // row height px

export const defaultPadding = 20
export const defaultOverscan = 20
export const defaultNumRowsPerPage = 20 // number of rows per page for keyboard navigation

const columnWidthsFormatVersion = '2' // increase in case of breaking changes in the column widths format
export const columnWidthsSuffix = `:${columnWidthsFormatVersion}:column:widths` // suffix used to store the column widths in local storage
const columnVisibilityStatesFormatVersion = '2' // increase in case of breaking changes in the column visibility format (changed from array by index to record by name)
export const columnVisibilityStatesSuffix = `:${columnVisibilityStatesFormatVersion}:column:visibility` // suffix used to store the columns visibility in local storage

export const ariaOffset = 2 // 1-based index, +1 for the header

// reference: https://meyerweb.com/eric/thoughts/2025/08/07/infinite-pixels/
// it seems to be 17,895,700 in Firefox, 33,554,400 in Chrome and 33,554,428 in Safari
export const maxElementHeight = 8_000_000 // a safe maximum height for an element in the DOM
