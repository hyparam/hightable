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

// 16,500px is ~0.2% of the canvas height for 8M px, it corresponds to 500 rows at 33px height.
// -> when scrolling with the mouse wheel, the change is local (< 16,500px)
// -> when scrolling with the scrollbar (drag/drop), or with the mouse wheel for a long time (> 500 rows), the change is global (> 0.2% of the scrollbar height)
// -> on mobile, swapping will also produce big jumps.
// TODO(SL): should we detect touch events and adapt the thresholds on mobile?
// TODO(SL): decrease/increase the threshold? make it configurable? or dependent on the number of rows, ie: a % of the scroll bar height?
export const largeScrollPx = 500 * rowHeight // px threshold to consider a scroll as "large"
