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

export interface ScrollState {
  isScrolling: boolean
  scale: Scale | undefined
  scrollTop: number | undefined
  globalAnchor: number | undefined
  localOffset: number
}

type ScrollAction
  = | { type: 'SET_SCALE', scale: Scale }
    | { type: 'ON_SCROLL', scrollTop: number }
    | { type: 'SCROLL_TO', scrollTop: number }
    | { type: 'ADD_DELTA', delta: number }

export function initializeScrollState(): ScrollState {
  return {
    isScrolling: false,
    scale: undefined,
    scrollTop: undefined,
    globalAnchor: undefined,
    localOffset: 0,
  }
}

export function scrollReducer(state: ScrollState, action: ScrollAction) {
  switch (action.type) {
    case 'SCROLL_TO':
      return {
        ...state,
        isScrolling: true,
        scrollTop: action.scrollTop,
        globalAnchor: action.scrollTop,
        localOffset: 0,
      }
    case 'ON_SCROLL': {
      const { scrollTop } = action

      const { scale, localOffset, globalAnchor, scrollTop: oldScrollTop } = state

      // conditions for local scroll:
      if (
        // globalAnchor is defined
        globalAnchor !== undefined
        // the previous scrollTop is defined
        && oldScrollTop !== undefined
        // scale is defined
        && scale !== undefined
        // there is virtual scroll
        && scale.factor !== 1
        // the last move is small
        && Math.abs(scrollTop - oldScrollTop) <= largeScrollPx
        // the accumulated localOffset is small enough
        && Math.abs(localOffset + (scrollTop - oldScrollTop)) <= largeScrollPx
        // scrollTop is greater than 0 - we will still be able to scroll back up
        && scrollTop > 0
        // scrollTop is not at the maximum - we will still be able to scroll further down
        && scrollTop < scale.canvasHeight - scale.parameters.clientHeight
      ) {
        // Local scroll
        return {
          ...state,
          isScrolling: false,
          scrollTop,
          localOffset: localOffset + scrollTop - oldScrollTop,
          // globalAnchor is unchanged
        }
      }

      // else, global scroll
      return {
        ...state,
        isScrolling: false,
        scrollTop,
        globalAnchor: scale
          // TODO(SL): maybe a bug for the maximum value, due to canvasHeight being larger due to the absolute positioning of the table?
          ? Math.max(0, Math.min(scrollTop, scale.canvasHeight - scale.parameters.clientHeight))
          : scrollTop,
        localOffset: 0,
      }
    }
    case 'ADD_DELTA':
      return {
        ...state,
        localOffset: state.localOffset + action.delta,
      }
    case 'SET_SCALE': {
      const { scale } = action

      // TODO(SL): if state.scale already existed, i.e. if some dimensions changed, update the state accordingly (globalAnchor, localOffset)
      // trying to keep the same view?
      // The most impactful change could be if the number of rows changed drastically.

      return {
        ...state,
        scale,
      }
    }
  }
}

/* Compute the derived values */
export function computeDerivedValues({ scale, scrollTop, globalAnchor, localOffset, padding }: Omit<ScrollState, 'isScrolling'> & { padding: number }): {
  sliceTop?: number | undefined
  visibleRowsStart?: number | undefined
  visibleRowsEnd?: number | undefined
  renderedRowsStart?: number | undefined
  renderedRowsEnd?: number | undefined
} {
  if (globalAnchor === undefined || scale === undefined) {
    return {}
  }
  const virtualScrollTop = scale.toVirtual(globalAnchor) + localOffset
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
  const virtualCanvasHeight = headerHeight + numRows * rowHeight

  if (virtualCanvasHeight <= maxElementHeight) {
    // no virtual scroll needed
    return {
      toVirtual: (scrollTop: number) => scrollTop,
      fromVirtual: (virtualScrollTop: number) => virtualScrollTop,
      factor: 1,
      canvasHeight: virtualCanvasHeight,
      virtualCanvasHeight,
      parameters,
    }
  }

  const canvasHeight = maxElementHeight

  // factor is strictly greater than 1
  // Also, note that, as maxElementHeight > clientHeight, canvasHeight is also greater, and the
  // denominator is always positive.
  const factor = (virtualCanvasHeight - clientHeight) / (canvasHeight - clientHeight)
  return {
    toVirtual: (scrollTop: number) => {
      return scrollTop * factor
    },
    fromVirtual: (virtualScrollTop: number) => {
      return virtualScrollTop / factor
    },
    factor,
    canvasHeight,
    virtualCanvasHeight,
    parameters,
  }
}

// TODO(SL): this logic should be shared with the 'ON_SCROLL' action in the reducer, to avoid code duplication
// and to ensure consistent behavior
export function getScrollActionForRow({
  rowIndex,
  scale,
  globalAnchor,
  localOffset,
}: {
  rowIndex: number
  scale: Scale
  globalAnchor: number
  localOffset: number
}): { delta: number } | { scrollTop: number } | undefined {
  const { headerHeight, rowHeight, numRows } = scale.parameters

  if (rowIndex < 1 || rowIndex > numRows + 1 || !Number.isInteger(rowIndex)) {
    throw new Error(`Invalid row index: ${rowIndex}. It should be an integer between 1 and ${numRows + 1}.`)
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
  const virtualScrollTop = scale.toVirtual(globalAnchor) + localOffset
  const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
  const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.parameters.clientHeight

  if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
    // fully visible, do nothing
    return
  }
  // else, it's partly or totally hidden: update the scroll position

  const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
  if (
    // no virtual scroll
    scale.factor === 1
    // big jump
    || Math.abs(delta) > largeScrollPx
    // or accumulated delta is big
    || Math.abs(localOffset + delta) > largeScrollPx
  ) {
    // scroll to the new position, and update the state optimistically
    const newVirtualScrollTop = virtualScrollTop + delta
    const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
    return { scrollTop: newScrollTop }
  } else {
    // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with localOffset
    return { delta }
  }
}
