import { type ReactNode, useCallback, useContext, useState } from 'react'

import { CanvasSizeContext } from '../contexts/CanvasSizeContext'
import { defaultRowsSliceContext, RowsSliceContext } from '../contexts/RowsSliceContext'
import { ViewportContext } from '../contexts/ViewportContext'

interface RowsSliceProviderProps {
  children: ReactNode
  numRows: number
  headerHeight: number
  rowHeight: number
  padding: number
}

export function RowsSliceProvider({ children, numRows, headerHeight, rowHeight, padding }: RowsSliceProviderProps) {
  const { canvasHeight } = useContext(CanvasSizeContext)
  const { viewportHeight, scrollTop, instantScrollTo } = useContext(ViewportContext)

  if (scrollTop < 0) {
    throw new Error(`Invalid scrollTop: ${scrollTop}. It should be a non-negative number.`)
  }
  if (scrollTop > canvasHeight - viewportHeight) {
    throw new Error(`Invalid scrollTop: ${scrollTop}. It should be less than or equal to canvasHeight - viewportHeight (${canvasHeight - viewportHeight}).`)
  }

  const virtualCanvasHeight = headerHeight + numRows * rowHeight

  const toVirtualScrollTop = useCallback((scrollTop: number) => {
    // convert scrollTop (in canvas coordinates, between 0px and canvasHeight - viewportHeight)
    // to virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - viewportHeight)
    return scrollTop * (virtualCanvasHeight - viewportHeight) / (canvasHeight - viewportHeight)
  }, [virtualCanvasHeight, canvasHeight, viewportHeight])

  const toScrollTop = useCallback((virtualScrollTop: number) => {
    // convert virtualScrollTop (in virtual canvas coordinates, between 0px and headerHeight + numRows * rowHeight - viewportHeight)
    // to scrollTop (in canvas coordinates, between 0px and canvasHeight - viewportHeight)
    return virtualScrollTop * (canvasHeight - viewportHeight) / (virtualCanvasHeight - viewportHeight)
  }, [virtualCanvasHeight, canvasHeight, viewportHeight])

  // scrollTop in the virtual canvas coordinates
  const [virtualScrollTop, setVirtualScrollTop] = useState(0)

  // sync virtualScrollTop with scrollTop
  const tolerancePixels = 1
  if (Math.abs(scrollTop - toScrollTop(virtualScrollTop)) > tolerancePixels) {
    setVirtualScrollTop(toVirtualScrollTop(scrollTop))
  }

  // scrollTop has a limited precision (1px, or subpixel on some browsers) and is not predictable exactly, in particular when used with zooming.
  // preciseScrollTop is decimal, computed for the virtual canvas, and updated by user action only when scrollTop changes significantly.
  // The scroll changed significantly, update preciseScrollTop
  // sync virtualScrollTop with scrollTop, limiting to valid range

  // safety checks
  if (rowHeight <= 0) {
    throw new Error(`Invalid rowHeight: ${rowHeight}. It should be a positive number.`)
  }
  if (headerHeight <= 0) {
    throw new Error(`Invalid headerHeight: ${headerHeight}. It should be a positive number.`)
  }
  if (canvasHeight <= 0) {
    throw new Error(`Invalid canvasHeight: ${canvasHeight}. It should be a positive number.`)
  }
  if (numRows < 0 || !Number.isInteger(numRows)) {
    throw new Error(`Invalid numRows: ${numRows}. It should be a non-negative integer.`)
  }
  if (padding < 0 || !Number.isInteger(padding)) {
    throw new Error(`Invalid padding: ${padding}. It should be a non-negative integer.`)
  }

  // Compute the derived values
  // TODO(SL): memoize?

  // special cases
  const isInHeader = numRows === 0 || virtualScrollTop < headerHeight

  // a. first visible row (r, d). It can be the header row (0).
  const firstVisibleRow = isInHeader
    ? 0
    : Math.max(0,
      Math.min(numRows - 1,
        Math.floor((virtualScrollTop - headerHeight) / rowHeight)
      )
    )
  // hidden pixels in the first visible row, or header
  const hiddenPixelsBefore = isInHeader
    ? virtualScrollTop
    : virtualScrollTop - headerHeight - firstVisibleRow * rowHeight

  // b. last visible row (s, e)
  const lastVisibleRow = Math.max(firstVisibleRow,
    Math.min(numRows - 1,
      Math.floor((virtualScrollTop + viewportHeight - headerHeight) / rowHeight)
    )
  )
  // const hiddenPixelsAfter = headerHeight + (lastVisibleRow + 1) * rowHeight - (virtualScrollTop + viewportHeight)

  // c. previous rows (k)
  const previousRows = Math.max(0, Math.min(padding, firstVisibleRow))

  // d. following rows (l)
  const followingRows = Math.max(0, Math.min(padding, numRows - 1 - lastVisibleRow))

  // e. offset of the first row in the canvas (u)
  const tableOffset = isInHeader
    ? scrollTop - hiddenPixelsBefore
    : scrollTop - headerHeight - previousRows * rowHeight - hiddenPixelsBefore

  // f. first data row and number of data rows
  const firstDataRow = firstVisibleRow - previousRows
  const numDataRows = numRows === 0 ? 0 :
    previousRows + followingRows + lastVisibleRow - firstVisibleRow + 1

  /**
   * Programmatically scroll to a specific row if needed.
   * Beware:
   * - row 1: header
   * - row 2: first data row
   * - row numRows + 1: last data row
   * @param row The row to scroll to (same semantic as aria-rowindex: 1-based, includes header)
   */
  const scrollToRowIndex = useCallback((rowIndex: number) => {
    if (rowIndex < 1 || rowIndex > numRows + 2 || !Number.isInteger(rowIndex)) {
      throw new Error(`Invalid first visible row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 2}.`)
    }
    if (!instantScrollTo) {
      console.warn('instantScrollTo function is not available. Cannot scroll to row.')
      return
    }

    if (rowIndex === 1) {
      // header row
      setVirtualScrollTop(0)
      instantScrollTo(0)
      return
    }

    const row = rowIndex - 2 // convert to 0-based data row index

    // Three cases:
    // - the row is fully visible: do nothing
    // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
    // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
    const hiddenPixelsBefore = virtualScrollTop - (headerHeight + row * rowHeight)
    const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - viewportHeight

    if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
      // fully visible, do nothing
      return
    }

    // partly or totally hidden: update the scroll position
    const newVirtualScrollTop = virtualScrollTop + (hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter)

    const newScrollTop = toScrollTop(newVirtualScrollTop)

    // Ensure the new scrollTop is within bounds
    if (newScrollTop < 0 || newScrollTop > canvasHeight - viewportHeight) {
      console.warn(`Computed scrollTop ${newScrollTop} is out of bounds (0, ${canvasHeight - viewportHeight}). Cannot scroll to table row index: ${rowIndex}.`)
      return
    }

    if (Math.abs(newScrollTop - scrollTop) > tolerancePixels) {
      // Update the coarse scroll position if the change is significant enough
      // for now, we ask for an instant scroll, there is no smooth scrolling
      // TODO(SL): if smooth scrolling is implemented, it might be async, so we should await it
      instantScrollTo(newScrollTop)
    } else {
      // Update the virtual scroll top
      setVirtualScrollTop(newVirtualScrollTop)
    }
  }, [numRows, scrollTop, virtualScrollTop, headerHeight, rowHeight, viewportHeight, toScrollTop, instantScrollTo, canvasHeight])

  // Note: we don't change the scroll position if numRows or viewportHeight change, we just adapt to the new situation.
  // TODO(SL): is this the desired behavior? We might try to keep the same first visible row if possible.
  // Also: we consider that headerHeight, rowHeight, canvasHeight and padding are fixed.

  // Don't check further if viewportHeight is zero or negative
  if (viewportHeight <= 0) {
    return (
      <RowsSliceContext.Provider value={defaultRowsSliceContext}>
        {children}
      </RowsSliceContext.Provider>
    )
  }

  const context = {
    firstDataRow,
    numDataRows,
    tableOffset,
    scrollToRowIndex,
  }

  // Checks
  // TODO(SL): investigate if these cases can occur in practice, and handle them properly instead of throwing errors.
  if (firstVisibleRow < 0 || firstVisibleRow > numRows + 1) {
    throw new Error(`Invalid first visible row: ${firstVisibleRow}. It should be between 0 and ${numRows + 1}.`)
  }
  if (isInHeader) {
    if (hiddenPixelsBefore < 0 || hiddenPixelsBefore >= headerHeight) {
      throw new Error(`Invalid hidden pixels before: ${hiddenPixelsBefore}. It should be positive and less than ${headerHeight} because the first hidden row is the header.`)
    }
  } else {
    if (hiddenPixelsBefore < 0 || hiddenPixelsBefore >= rowHeight) {
      throw new Error(`Invalid hidden pixels before: ${hiddenPixelsBefore}. It should be positive and less than ${rowHeight}.`)
    }
  }
  if (lastVisibleRow < firstVisibleRow || lastVisibleRow > numRows + 1) {
    throw new Error(`Invalid last visible row: ${lastVisibleRow}. It should be between firstVisibleRow (${firstVisibleRow}) and ${numRows + 1}.`)
  }
  // if (hiddenPixelsAfter < 0 || hiddenPixelsAfter > rowHeight) {
  //   throw new Error(`Invalid hidden pixels after: ${hiddenPixelsAfter}. It should be positive and less than or equal to ${rowHeight} (we might have a subpixel approximation).`)
  // }
  if (previousRows < 0 || previousRows > padding || previousRows > firstVisibleRow || previousRows > numRows) {
    throw new Error(`Invalid previous rows: ${previousRows}. It should be between 0 and min(padding (${padding}), firstVisibleRow (${firstVisibleRow}), numRows (${numRows})).`)
  }
  if (followingRows < 0 || followingRows > padding || followingRows > numRows) {
    throw new Error(`Invalid following rows: ${followingRows}. It should be between 0 and min(padding (${padding}), numRows (${numRows})).`)
  }

  if (firstDataRow < 0 || numRows > 0 && firstDataRow >= numRows) {
    throw new Error(`Invalid first data row: ${firstDataRow}. It should be between 0 and ${numRows - 1}.`)
  }
  if (numDataRows < 0 || firstDataRow + numDataRows > numRows) {
    throw new Error(`Invalid number of data rows: ${numDataRows}. firstDataRow + numDataRows should be less than or equal to ${numRows}.`)
  }
  if (tableOffset > scrollTop) {
    throw new Error(`Invalid table offset: ${tableOffset}. It should be less than or equal to scrollTop (${scrollTop}).`)
  }

  return (
    <RowsSliceContext.Provider value={context}>
      {children}
    </RowsSliceContext.Provider>
  )
}
