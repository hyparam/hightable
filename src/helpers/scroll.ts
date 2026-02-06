import { ariaOffset, largeScrollPx } from './constants.js'

interface ScaleParameters {
  clientHeight: number
  headerHeight: number
  maxElementHeight: number
  numRows: number
  rowHeight: number
}

export interface Scale {
  toVirtual: (scrollTop: number) => number
  fromVirtual: (virtualScrollTop: number) => number
  factor: number
  canvasHeight: number
  virtualCanvasHeight: number
  parameters: ScaleParameters
}

/**
 * The state to handle virtual scrolling
 *
 * - scrollTop: the current scrollTop of HTML <div> container
 * - scrollTopAnchor: the scrollTop position that anchors the virtual scroll calculations. It differs from scrollTop when local scrolling is applied.
 * - localOffset: the local offset added to the virtual scrollTop to scroll locally (for small scroll deltas)
 * - scale: the scale mapping scrollTop to virtual scrollTop
 */
export interface ScrollState {
  scale: Scale | undefined
  scrollTop: number | undefined
  scrollTopAnchor: number | undefined
  localOffset: number
}

type ScrollAction
  = | { type: 'SET_SCALE', scale: Scale }
    | { type: 'ON_SCROLL', scrollTop: number }
    | { type: 'SCROLL_TO', scrollTop: number }
    | { type: 'LOCAL_SCROLL', delta: number }
    | { type: 'GLOBAL_SCROLL', scrollTop: number }

export function initializeScrollState(): ScrollState {
  return {
    scale: undefined,
    scrollTop: undefined,
    scrollTopAnchor: undefined,
    localOffset: 0,
  }
}

// conditions for local scroll:
function canBeLocalScroll({ delta, scale, localOffset}: { delta: number, scale: Scale, localOffset: number }): boolean {
  return (
    // there is virtual scroll
    scale.factor !== 1
    // the last move is small
    && Math.abs(delta) <= largeScrollPx
    // the accumulated localOffset is small enough
    && Math.abs(localOffset + delta) <= largeScrollPx
  )
}

function clampScrollTop(scrollTop: number, scale: Scale | undefined): number {
  if (!scale) {
    return scrollTop
  }
  return Math.max(0, Math.min(scrollTop, scale.canvasHeight - scale.parameters.clientHeight))
}

export function scrollReducer(state: ScrollState, action: ScrollAction): ScrollState {
  switch (action.type) {
    case 'SET_SCALE': {
      const { scale } = action

      // TODO(SL): if state.scale already existed, i.e. if some dimensions changed, update the state accordingly (scrollTopAnchor, localOffset)
      // trying to keep the same view?
      // The most impactful change could be if the number of rows changed drastically.

      return {
        ...state,
        scale,
      }
    }
    case 'SCROLL_TO': {
      // update the state optimistically, while waiting for the scroll event to arrive
      return scrollReducer(state, { type: 'GLOBAL_SCROLL', scrollTop: action.scrollTop })
    }
    case 'ON_SCROLL': {
      const { scrollTop } = action

      const { localOffset, scrollTopAnchor, scrollTop: oldScrollTop, scale } = state

      // in either case, after a scroll event, save the scrollTop value
      const nextState = {
        ...state,
        scrollTop,
      }

      const delta = oldScrollTop === undefined ? undefined : scrollTop - oldScrollTop
      const scrollAction: ScrollAction = (
        // scrollTopAnchor is defined
        scrollTopAnchor !== undefined
        // the previous scrollTop is defined (hence delta is defined)
        && delta !== undefined
        // scale is defined
        && scale !== undefined
        // the scroll delta is small enough and the scale is virtual
        && canBeLocalScroll({ delta, scale, localOffset })
        // scrollTop is greater than 0 - we will still be able to scroll back up
        && scrollTop > 0
        // scrollTop is not at the maximum - we will still be able to scroll further down
        && scrollTop < scale.canvasHeight - scale.parameters.clientHeight
      )
        ? { type: 'LOCAL_SCROLL', delta }
        : { type: 'GLOBAL_SCROLL', scrollTop }

      return scrollReducer(nextState, scrollAction)
    }
    case 'LOCAL_SCROLL': {
      return {
        ...state,
        localOffset: state.localOffset + action.delta,
      }
    }
    case 'GLOBAL_SCROLL': {
      // GLOBAL_SCROLL
      // set scrollTopAnchor to the new scrollTop, but adjusted to be within the valid range
      // TODO(SL): bug for the maximum value: small gap above the header when scrolled to the bottom
      // (due to canvasHeight being larger due to the absolute positioning of the table? due to the 2px border?)
      return {
        ...state,
        scrollTop: action.scrollTop,
        scrollTopAnchor: clampScrollTop(action.scrollTop, state.scale),
        localOffset: 0,
      }
    }
  }
}

/* Compute the derived values */
export function computeDerivedValues({ scale, scrollTop, scrollTopAnchor, localOffset, padding }: ScrollState & { padding: number }): {
  sliceTop?: number | undefined
  visibleRowsStart?: number | undefined
  visibleRowsEnd?: number | undefined
  renderedRowsStart?: number | undefined
  renderedRowsEnd?: number | undefined
} {
  if (scrollTopAnchor === undefined || scale === undefined) {
    return {}
  }
  const virtualScrollTop = scale.toVirtual(scrollTopAnchor) + localOffset
  const { clientHeight, headerHeight, rowHeight, numRows } = scale.parameters

  // special case: is the virtual scroll position in the header?
  const isInHeader = numRows === 0 || virtualScrollTop < headerHeight

  // First visible row. It can be the header row (0).
  const visibleRowsStart = isInHeader
    ? 0
    : Math.max(0,
        Math.min(numRows - 1,
          Math.floor((virtualScrollTop - headerHeight) / rowHeight)
        )
      )
  if (isNaN(visibleRowsStart)) throw new Error(`invalid start row ${visibleRowsStart}`)
  const renderedRowsStart = Math.max(0, visibleRowsStart - padding)

  // hidden pixels in the first visible row, or header
  const hiddenPixelsBefore = isInHeader
    ? virtualScrollTop
    : virtualScrollTop - headerHeight - visibleRowsStart * rowHeight

  // Last visible row
  const visibleRowsEnd = Math.max(visibleRowsStart,
    Math.min(numRows - 1,
      Math.floor((virtualScrollTop + clientHeight - headerHeight) / rowHeight)
    )
  ) + 1 // end is exclusive
  if (isNaN(visibleRowsEnd)) throw new Error(`invalid end row ${visibleRowsEnd}`)
  const renderedRowsEnd = Math.min(numRows, visibleRowsEnd + padding)
  if (renderedRowsEnd - renderedRowsStart > 1000) throw new Error(`attempted to render too many rows ${renderedRowsEnd - renderedRowsStart}`)

  // Uncomment if needed
  // const hiddenPixelsAfter = headerHeight + visibleRowsEnd * rowHeight - (virtualScrollTop + clientHeight)

  if (scrollTop === undefined) {
    return {
      visibleRowsStart,
      visibleRowsEnd,
      renderedRowsStart,
      renderedRowsEnd,
    }
  }

  // Offset of the first row in the canvas (sliceTop)

  // Y-offset of the first visible data row in the full scrollable canvas,
  // i.e. the scroll position minus the number of hidden pixels for that row.
  const firstVisibleRowTop = scrollTop - hiddenPixelsBefore

  // Number of "padding" rows that we render above the first visible row
  const previousPaddingRows = visibleRowsStart - renderedRowsStart

  // When the scroll position is still within the header, the first visible
  // data row starts right after the header. Encode that as 0/1 so we can
  // subtract a single headerHeight when we are in the body.
  const headerRow = isInHeader ? 0 : 1

  // The top of the rendered slice in canvas coordinates:
  // - start from the top of the first visible row
  // - subtract the header height (once) when we are below the header
  // - shift up by the number of padding rows times the row height so that
  //   those extra rows are also included in the rendered slice.
  const sliceTop = firstVisibleRowTop - headerRow * headerHeight - previousPaddingRows * rowHeight

  return {
    sliceTop,
    visibleRowsStart,
    visibleRowsEnd,
    renderedRowsStart,
    renderedRowsEnd,
  }
}

export function createScale(parameters: {
  clientHeight: number
  headerHeight: number
  maxElementHeight: number
  numRows: number
  rowHeight: number
}): Scale {
  const { clientHeight, headerHeight, maxElementHeight, numRows, rowHeight } = parameters

  // safety checks
  if (headerHeight <= 0) {
    throw new Error(`Invalid headerHeight: ${headerHeight}. It should be a positive number.`)
  }
  if (rowHeight <= 0) {
    throw new Error(`Invalid rowHeight: ${rowHeight}. It should be a positive number.`)
  }
  if (numRows < 0 || !Number.isInteger(numRows)) {
    throw new Error(`Invalid numRows: ${numRows}. It should be a non-negative integer.`)
  }
  if (maxElementHeight <= 0) {
    throw new Error(`Invalid maxElementHeight: ${maxElementHeight}. It should be a positive number.`)
  }
  if (maxElementHeight <= clientHeight) {
    throw new Error(`Invalid maxElementHeight: ${maxElementHeight} when clientHeight is ${clientHeight}. maxElementHeight should be greater than clientHeight.`)
  }

  // total table height - it's fixed, based on the number of rows.
  // if the number of rows is big, this value can overflow the maximum height supported by the browser.
  // If so, the canvas height is capped to maxElementHeight.
  const totalTableHeight = headerHeight + numRows * rowHeight

  if (totalTableHeight <= maxElementHeight) {
    // no virtual scroll needed
    return {
      toVirtual: (scrollTop: number) => scrollTop,
      fromVirtual: (virtualScrollTop: number) => virtualScrollTop,
      factor: 1,
      canvasHeight: totalTableHeight,
      virtualCanvasHeight: totalTableHeight,
      parameters,
    }
  }

  const canvasHeight = maxElementHeight

  // factor is strictly greater than 1
  // Also, note that, as maxElementHeight > clientHeight, canvasHeight is also greater, and the
  // denominator is always positive.
  const factor = (totalTableHeight - clientHeight) / (canvasHeight - clientHeight)
  return {
    toVirtual: (scrollTop: number) => {
      return scrollTop * factor
    },
    fromVirtual: (virtualScrollTop: number) => {
      return virtualScrollTop / factor
    },
    factor,
    canvasHeight,
    virtualCanvasHeight: totalTableHeight,
    parameters,
  }
}

interface LocalScrollAction {
  type: 'LOCAL_SCROLL'
  delta: number
}

interface ScrollToAction {
  type: 'SCROLL_TO'
  scrollTop: number
}

export function getScrollActionForRow({
  rowIndex,
  scale,
  scrollTopAnchor,
  localOffset,
}: {
  rowIndex: number
  scale: Scale
  scrollTopAnchor: number
  localOffset: number
}): ScrollToAction | LocalScrollAction | undefined {
  const { headerHeight, rowHeight, numRows } = scale.parameters

  if (rowIndex < 1 || rowIndex > numRows + 1 || !Number.isInteger(rowIndex)) {
    console.warn(`Invalid row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 1}.`)
    return
  }

  if (rowIndex === 1) {
    // header row
    return
  }

  const row = rowIndex - ariaOffset // convert to 0-based data row index

  // Three cases:
  // - the row is fully visible: do nothing
  // - the row start is before virtualScrollTop + headerHeight: scroll to snap its start with that value
  // - the row end is after virtualScrollTop + viewportHeight: scroll to snap its end with that value
  const virtualScrollTop = scale.toVirtual(scrollTopAnchor) + localOffset
  const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
  const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.parameters.clientHeight

  if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
    // fully visible, do nothing
    return
  }
  // else, it's partly or totally hidden: update the scroll position

  const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
  if (canBeLocalScroll({ delta, scale, localOffset })) {
    // move slightly: keep scrollTop and scrollTopAnchor untouched, compensate with localOffset
    return { type: 'LOCAL_SCROLL', delta }
  } else {
    // scroll to the new position, and update the state optimistically
    const newVirtualScrollTop = virtualScrollTop + delta
    const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
    return { type: 'SCROLL_TO', scrollTop: newScrollTop }
  }
}
