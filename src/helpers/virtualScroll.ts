import { ariaOffset, largeScrollPx } from '../helpers/constants.js'

export interface Scale {
  toVirtual: (scrollTop: number) => number
  fromVirtual: (virtualScrollTop: number) => number
  factor: number
  virtualCanvasHeight: number
  parameters: {
    canvasHeight: number
    clientHeight: number
    headerHeight: number
    numRows: number
    rowHeight: number
  }
}

export interface ScrollState {
  isScrolling: boolean
  scale: Scale | undefined
  scrollTop: number | undefined
  virtualScrollBase: number | undefined
  virtualScrollDelta: number
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
    virtualScrollBase: undefined,
    virtualScrollDelta: 0,
  }
}

export function scrollReducer(state: ScrollState, action: ScrollAction) {
  switch (action.type) {
    case 'SCROLL_TO':
      return {
        ...state,
        isScrolling: true,
        scrollTop: action.scrollTop,
        virtualScrollBase: state.scale?.toVirtual(action.scrollTop),
        virtualScrollDelta: 0,
      }
    case 'ON_SCROLL': {
      const isScrolling = false
      const { scrollTop } = action

      // if virtualScrollBase is undefined, we initialize it here
      const { scale, virtualScrollDelta, virtualScrollBase, scrollTop: oldScrollTop } = state

      if (virtualScrollBase === undefined) {
        if (!scale) {
          // cannot compute virtualScrollBase without scale
          return {
            ...state,
            isScrolling,
            scrollTop,
          }
        }

        // initialize virtualScrollBase
        return {
          ...state,
          isScrolling,
          scrollTop,
          // we assume that virtualScrollDelta is valid (surely 0 at this point)
          virtualScrollBase: scale.toVirtual(scrollTop) - virtualScrollDelta,
        }
      }

      if (oldScrollTop === undefined) {
        // cannot compute a delta without oldScrollTop
        return {
          ...state,
          isScrolling,
          scrollTop,
        }
      }

      const delta = scrollTop - oldScrollTop

      // Do a global jump (reset local scroll based on the new scrollTop value) if
      if (
        // we can compute virtualScrollBase and one of the following conditions is met
        scale !== undefined && (
          // the last move is big
          Math.abs(delta) > largeScrollPx
          // the accumulated virtualScrollDelta is big
          || Math.abs(virtualScrollDelta + delta) > largeScrollPx
          // scrollTop is 0 - cannot scroll back up, we need to reset to the first row
          || scrollTop <= 0
          // scrollTop is at the maximum - cannot scroll further down, we need to reset to the last row
          || scrollTop >= scale.parameters.canvasHeight - scale.parameters.clientHeight
        )
      ) {
        // reset virtualScrollBase and virtualScrollDelta
        return {
          ...state,
          isScrolling,
          scrollTop,
          // TODO(SL): maybe a bug for the maximum value, due to canvasHeight being larger due to the absolute positioning of the table?
          virtualScrollBase: scale.toVirtual(Math.max(0, Math.min(scrollTop, scale.parameters.canvasHeight - scale.parameters.clientHeight))),
          virtualScrollDelta: 0,
        }
      }

      // Adjust virtualScrollDelta
      return {
        ...state,
        isScrolling,
        scrollTop,
        virtualScrollDelta: virtualScrollDelta + delta,
      }
    }
    case 'ADD_DELTA':
      return {
        ...state,
        virtualScrollDelta: state.virtualScrollDelta + action.delta,
      }
    case 'SET_SCALE': {
      const { scale } = action
      const { virtualScrollBase, virtualScrollDelta, scrollTop } = state

      // initialize virtualScrollBase if needed and possible
      if (virtualScrollBase === undefined && scrollTop !== undefined) {
        return {
          ...state,
          scale,
          // we assume that virtualScrollDelta is valid (surely 0 at this point)
          virtualScrollBase: scale.toVirtual(scrollTop) - virtualScrollDelta,
        }
      }

      // TODO(SL): if state.scale already existed, i.e. if some dimensions changed, update the state accordingly (virtualScrollBase, virtualScrollDelta)
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
export function computeDerivedValues({ scale, scrollTop, virtualScrollBase, virtualScrollDelta, padding }: Omit<ScrollState, 'isScrolling'> & { padding: number }): {
  sliceTop?: number | undefined
  visibleRowsStart?: number | undefined
  visibleRowsEnd?: number | undefined
  renderedRowsStart?: number | undefined
  renderedRowsEnd?: number | undefined
} {
  if (virtualScrollBase === undefined || scale === undefined) {
    return {}
  }
  const virtualScrollTop = virtualScrollBase + virtualScrollDelta
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
  canvasHeight: number
  headerHeight: number
  rowHeight: number
  numRows: number
}): Scale {
  const { clientHeight, canvasHeight, headerHeight, rowHeight, numRows } = parameters
  const virtualCanvasHeight = headerHeight + numRows * rowHeight

  // safety checks
  if (headerHeight <= 0) {
    throw new Error(`Invalid headerHeight: ${headerHeight}. It should be a positive number.`)
  }
  if (rowHeight <= 0) {
    throw new Error(`Invalid rowHeight: ${rowHeight}. It should be a positive number.`)
  }
  if (canvasHeight <= 0) {
    throw new Error(`Invalid canvasHeight: ${canvasHeight}. It should be a positive number.`)
  }
  if (numRows < 0 || !Number.isInteger(numRows)) {
    throw new Error(`Invalid numRows: ${numRows}. It should be a non-negative integer.`)
  }
  if (canvasHeight <= clientHeight) {
    throw new Error(`Invalid canvasHeight: ${canvasHeight} when clientHeight is ${clientHeight}. canvasHeight should be greater than clientHeight for virtual scrolling.`)
  }
  if (virtualCanvasHeight <= clientHeight) {
    throw new Error(`Invalid virtualCanvasHeight: ${virtualCanvasHeight} when clientHeight is ${clientHeight}. virtualCanvasHeight should be greater than clientHeight for virtual scrolling.`)
  }

  const factor = (virtualCanvasHeight - clientHeight) / (canvasHeight - clientHeight)
  return {
    toVirtual: (scrollTop: number) => {
      return scrollTop * factor
    },
    fromVirtual: (virtualScrollTop: number) => {
      return virtualScrollTop / factor
    },
    factor,
    virtualCanvasHeight,
    parameters: {
      canvasHeight,
      clientHeight,
      headerHeight,
      numRows,
      rowHeight,
    },
  }
}

// TODO(SL): this logic should be shared with the 'ON_SCROLL' action in the reducer, to avoid code duplication
// and to ensure consistent behavior
export function getScrollActionForRow({
  rowIndex,
  scale,
  virtualScrollBase,
  virtualScrollDelta,
}: {
  rowIndex: number
  scale: Scale
  virtualScrollBase: number
  virtualScrollDelta: number
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
  const virtualScrollTop = virtualScrollBase + virtualScrollDelta
  const hiddenPixelsBefore = virtualScrollTop + headerHeight - (headerHeight + row * rowHeight)
  const hiddenPixelsAfter = headerHeight + row * rowHeight + rowHeight - virtualScrollTop - scale.parameters.clientHeight

  if (hiddenPixelsBefore <= 0 && hiddenPixelsAfter <= 0) {
    // fully visible, do nothing
    return
  }
  // else, it's partly or totally hidden: update the scroll position

  const delta = hiddenPixelsBefore > 0 ? -hiddenPixelsBefore : hiddenPixelsAfter
  if (
    // big jump
    Math.abs(delta) > largeScrollPx
    // or accumulated delta is big
    || Math.abs(virtualScrollDelta + delta) > largeScrollPx
  ) {
    // scroll to the new position, and update the state optimistically
    const newVirtualScrollTop = virtualScrollTop + delta
    const newScrollTop = scale.fromVirtual(newVirtualScrollTop)
    return { scrollTop: newScrollTop }
  } else {
    // move slightly: keep scrollTop and virtualScrollTop untouched, compensate with virtualScrollDelta
    return { delta }
  }
}
