import { createContext } from 'react'

export interface RowsSliceContextType {
  // TODO(SL): harmonize the row indexes (with/without header, aria-rowindex, etc.)
  /* First row of the slice
   * It does not include the header row, and is comprised between 0 and df.numRows - 1.
   */
  firstDataRow: number
  /* Number of rows in the slice, excluding the header */
  numDataRows: number
  /* Position of the table in the canvas
   * Number of pixels from the top of the canvas to the header
   *
   * It can be negative, and we hide the extra pixels (canvas must have overflow: hidden,
   * or the maths will be wrong).
  */
  tableOffset: number
  /**
   * Go to a specific row in the virtual canvas, trying to minimize the scrolling.
   * The scrolling is done with the behavior 'instant'.
   * If the row is already fully visible, do nothing.
   * If the row is partially visible, scroll just enough to make it fully visible.
   * If the row is not visible, scroll to make it the first or last visible row, whichever minimizes scrolling.
   * We assume the row height is fixed and less than the viewport height.
   * TODO(SL): handle the case where the row height is greater than the viewport height.
   * TODO(SL): provide scrolling beahavior 'smooth' instead of 'instant', in the case
   *   where the row is already in the slice (but not fully visible)? Using scrollIntoView?
   * @param rowIndex The row to go to (same semantic as aria-rowindex: 1-based, includes header, see cells navigation)
   */
  scrollToRowIndex?: (rowIndex: number) => undefined | { canScrollHorizontally: boolean }
}

export const defaultRowsSliceContext: RowsSliceContextType = {
  firstDataRow: 0,
  numDataRows: 0,
  tableOffset: 0,
}

export const RowsSliceContext = createContext<RowsSliceContextType>(defaultRowsSliceContext)
