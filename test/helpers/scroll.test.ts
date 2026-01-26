import { describe, expect, it } from 'vitest'

import type { Scale, ScrollState } from '../../src/helpers/scroll.js'
import { computeDerivedValues, createScale, getScrollActionForRow, initializeScrollState, scrollReducer } from '../../src/helpers/scroll.js'

describe('createScale', () => {
  it('creates a scale with factor=1 when the number of rows is low', () => {
    const parameters = {
      clientHeight: 500,
      headerHeight: 50,
      maxElementHeight: 30_000,
      numRows: 100,
      rowHeight: 20,
    }
    const scale = createScale(parameters)
    expect(scale.parameters).toEqual(parameters)
    expect(scale.virtualCanvasHeight).toBe(2_050) // headerHeight + numRows * rowHeight
    expect(scale.canvasHeight).toBe(2_050)
    expect(scale.factor).toBeCloseTo(1)
    expect(scale.toVirtual(0)).toBe(0)
    expect(scale.toVirtual(100)).toBe(100)
    expect(scale.fromVirtual(0)).toBe(0)
    expect(scale.fromVirtual(2_000)).toBe(2_000)
  })

  it('creates a scale with factor > 1 when the number of rows is high', () => {
    const parameters = {
      clientHeight: 500,
      headerHeight: 50,
      maxElementHeight: 30_000,
      numRows: 100_000,
      rowHeight: 20,
    }
    const scale = createScale(parameters)
    expect(scale.parameters).toEqual(parameters)
    expect(scale.virtualCanvasHeight).toBe(2_000_050) // headerHeight + numRows * rowHeight
    expect(scale.canvasHeight).toBe(30_000)
    expect(scale.factor).toBeCloseTo(67.78)
    expect(scale.toVirtual(0)).toBe(0)
    expect(scale.fromVirtual(0)).toBe(0)
    expect(scale.toVirtual(100)).toBeCloseTo(6_778, 0)
    expect(scale.fromVirtual(6_778)).toBeCloseTo(100, 0)
  })

  it.each([
    // zero values
    { headerHeight: 0 },
    { rowHeight: 0 },
    { maxElementHeight: 0 },
    // negative values
    { headerHeight: -10 },
    { rowHeight: -5 },
    { numRows: -100 },
    { maxElementHeight: -100 },
    // less than clientHeight
    { maxElementHeight: 400 },
    // non-integer
    { numRows: 20.5 },
  ])('throws if a parameter is not valid (%o)', (params) => {
    const validParameters = {
      clientHeight: 500,
      headerHeight: 50,
      maxElementHeight: 30_000,
      numRows: 1_000,
      rowHeight: 20,
    }
    const parameters = {
      ...validParameters,
      ...params,
    }
    expect(() => createScale(parameters)).toThrow()
  })

  it('handles the case with zero rows', () => {
    const parameters = {
      clientHeight: 20,
      headerHeight: 50,
      maxElementHeight: 1_000,
      numRows: 0,
      rowHeight: 20,
    }
    const scale = createScale(parameters)
    expect(scale.parameters).toEqual(parameters)
    expect(scale.virtualCanvasHeight).toBe(50) // headerHeight + numRows * rowHeight
    expect(scale.factor).toBe(1)
  })
})

describe('computeDerivedValues', () => {
  it('computes derived values correctly', () => {
    const scale = createScale({
      clientHeight: 1_000,
      headerHeight: 50,
      maxElementHeight: 10_000,
      numRows: 20_000,
      rowHeight: 30,
    })
    const { sliceTop, visibleRowsStart, visibleRowsEnd, renderedRowsStart, renderedRowsEnd } = computeDerivedValues({
      scale,
      // these values are arbitrary for the test
      scrollTop: 200,
      scrollTopAnchor: scale.fromVirtual(600), // TODO(SL): put a value directly
      localOffset: 150,
      padding: 5,
    })
    expect(sliceTop).toBe(-10)
    expect(visibleRowsStart).toBe(23)
    expect(visibleRowsEnd).toBe(57)
    expect(renderedRowsStart).toBe(18)
    expect(renderedRowsEnd).toBe(62)
  })

  it('computes derived values correctly in normal mode', () => {
    const scale = createScale({
      clientHeight: 1_000,
      headerHeight: 50,
      maxElementHeight: 1_000_000,
      numRows: 20_000,
      rowHeight: 30,
    })
    const { sliceTop, visibleRowsStart, visibleRowsEnd, renderedRowsStart, renderedRowsEnd } = computeDerivedValues({
      scale,
      // these values are arbitrary for the test
      scrollTop: 2_000,
      scrollTopAnchor: 2_000,
      localOffset: 0,
      padding: 5,
    })
    expect(sliceTop).toBe(1_800)
    expect(visibleRowsStart).toBe(65)
    expect(visibleRowsEnd).toBe(99)
    expect(renderedRowsStart).toBe(60)
    expect(renderedRowsEnd).toBe(104)
  })

  it('adds padding only when possible', () => {
    const scale = createScale({
      clientHeight: 1_000,
      headerHeight: 50,
      maxElementHeight: 10_000,
      numRows: 100,
      rowHeight: 30,
    })
    const { sliceTop, visibleRowsStart, visibleRowsEnd, renderedRowsStart, renderedRowsEnd } = computeDerivedValues({
      scale,
      // these values are arbitrary for the test
      scrollTop: 0,
      scrollTopAnchor: 0,
      localOffset: 0,
      padding: 10,
    })
    expect(sliceTop).toBe(0)
    expect(visibleRowsStart).toBe(0)
    expect(visibleRowsEnd).toBe(32)
    expect(renderedRowsStart).toBe(0) // cannot go below 0
    expect(renderedRowsEnd).toBe(42) // can add full padding at the end
  })
})

describe('initializeScrollState', () => {
  it('returns the initial scroll state', () => {
    const state = initializeScrollState()
    expect(state).toEqual({
      isScrolling: false,
      scale: undefined,
      scrollTop: undefined,
      scrollTopAnchor: undefined,
      localOffset: 0,
    })
  })
})

describe('getScrollActionForRow', () => {
  describe('in normal scrolling mode (scale.factor = 1)', () => {
    it.each([
      { rowIndex: 1, scrollTopAnchor: 0 },
      { rowIndex: 10, scrollTopAnchor: 100 },
      { rowIndex: 50, scrollTopAnchor: 1_000 },
    ])('returns undefined if the row is already in view', ({ rowIndex, scrollTopAnchor }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor, localOffset: 0 })
      expect(action).toBeUndefined()
    })

    it.each([
      { rowIndex: 2, scrollTopAnchor: 500, expectedScrollTop: 0 },
      { rowIndex: 500, scrollTopAnchor: 0, expectedScrollTop: 15_517 },
      { rowIndex: 800, scrollTopAnchor: 0, expectedScrollTop: 25_417 },
      { rowIndex: 800, scrollTopAnchor: 25_000, expectedScrollTop: 25_417 },
    ])('returns a scrollTop action to scroll to the row in all the cases, small or large scroll (%o)', ({ rowIndex, scrollTopAnchor, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor, localOffset: 0 })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it.each([
      { rowIndex: 500, scrollTopAnchor: 0, expectedScrollTop: 15_517 },
      { rowIndex: 500, scrollTopAnchor: 30_000, expectedScrollTop: 16_434 },
    ])('returns different scrollTop value if the current row was before or after the next one (nearest neighbor) (%o)', ({ rowIndex, scrollTopAnchor, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor, localOffset: 0 })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it.each([
      // would be a delta, but rowIndex 1 is the header
      { rowIndex: 1, scrollTopAnchor: 500 },
      // would be a scrollTop, but rowIndex 1 is the header
      { rowIndex: 1, scrollTopAnchor: 50_000 },
    ])('returns undefined if the rowIndex is the header, because it is always in view (%o)', ({ rowIndex, scrollTopAnchor }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor, localOffset: 0 })
      expect(action).toBeUndefined()
    })
  })

  describe('in virtual scrolling mode (scale.factor > 1)', () => {
    it.each([
      { rowIndex: 1, virtualScrollBase: 0, localOffset: 0 },
      { rowIndex: 2, virtualScrollBase: 0, localOffset: 0 },
      { rowIndex: 10, virtualScrollBase: 100, localOffset: 0 },
      { rowIndex: 10, virtualScrollBase: 100, localOffset: -100 },
      { rowIndex: 50, virtualScrollBase: 1_000, localOffset: 200 },
    ])('returns undefined if the row is already in view', ({ rowIndex, virtualScrollBase, localOffset }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset })
      expect(action).toBeUndefined()
    })

    it.each([
      { rowIndex: 5, virtualScrollBase: 500, localOffset: 0, expectedDelta: -401 },
      { rowIndex: 500, virtualScrollBase: 0, localOffset: 0, expectedDelta: 15_517 },
      { rowIndex: 500, virtualScrollBase: 1_000, localOffset: 1_000, expectedDelta: 13_517 },
    ])('returns a local scroll action (positive or negative) to scroll to the row when a small scroll is needed (%o)', ({ rowIndex, virtualScrollBase, localOffset, expectedDelta }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset })
      expect(action).toEqual({ type: 'LOCAL_SCROLL', delta: expectedDelta })
    })

    it.each([
      { rowIndex: 2, virtualScrollBase: 50_000, localOffset: 0, expectedScrollTop: 0 },
      { rowIndex: 800, virtualScrollBase: 0, localOffset: 0, expectedScrollTop: 7_137 },
    ])('returns a scrollTop action to scroll to the row when a large scroll is needed (%o)', ({ rowIndex, virtualScrollBase, localOffset, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it.each([
      // from above
      { rowIndex: 5_000, virtualScrollBase: 0, expectedScrollTop: 49_347 },
      // from below
      { rowIndex: 5_000, virtualScrollBase: 200_000, expectedScrollTop: 49_623 },
    ])('returns different scrollTop value if the current row was before or after the next one (nearest neighbor) (%o)', ({ rowIndex, virtualScrollBase, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 100_000,
        numRows: 10_000,
        rowHeight: 33,
      })
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset: 0 })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it('returns a scrollTop action when the accumulated delta would exceed largeScrollPx threshold', () => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const localOffset = 16_500 // below the largeScrollPx threshold (16,500)
      const rowIndex = 600
      const virtualScrollBase = 0
      // should add a small delta (2_317), but the accumulated delta (18_817) exceeds largeScrollPx, so: scrollTop is returned to synchronize properly
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(5_284, 0)
    })

    it.each([
      // would be a delta, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 500, localOffset: 0, expectedDelta: -401 },
      // would be a scrollTop, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 50_000, localOffset: 0 },
    ])('returns undefined if the rowIndex is the header, because it is always in view (%o)', ({ rowIndex, virtualScrollBase, localOffset }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      // TODO(SL): directly set scrollTopAnchor instead of virtualScrollBase
      const action = getScrollActionForRow({ scale, rowIndex, scrollTopAnchor: scale.fromVirtual(virtualScrollBase), localOffset })
      expect(action).toBeUndefined()
    })
  })
})

function createNormalScale(): Scale {
  return createScale({
    clientHeight: 1_000,
    headerHeight: 50,
    maxElementHeight: 1_000_000,
    numRows: 1_000,
    rowHeight: 33,
  })
}

function createVirtualScale(): Scale {
  return createScale({
    clientHeight: 1_000,
    headerHeight: 50,
    maxElementHeight: 100_000,
    numRows: 100_000,
    rowHeight: 33,
  })
}

describe('scrollReducer', () => {
  describe('SET_SCALE action', () => {
    it('sets the scale in the state', () => {
      const initialState = initializeScrollState()
      const scale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBeUndefined()
      expect(newState.scrollTopAnchor).toBeUndefined()
      expect(newState.localOffset).toBe(0)
    })

    it('does not change other state properties when setting scale', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: undefined,
        scrollTop: 100,
        scrollTopAnchor: 200,
        localOffset: 10,
      }
      const scale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(true)
      expect(newState.scrollTop).toBe(100)
      expect(newState.scrollTopAnchor).toBe(200)
      expect(newState.localOffset).toBe(10)
    })

    // TODO(SL): maybe it should reset virtualScrollBase and localOffset if the scale changes
    it('does not change other state properties when updating scale', () => {
      const initialState: ScrollState = {
        isScrolling: false,
        scale: createNormalScale(),
        scrollTop: 100,
        scrollTopAnchor: 200,
        localOffset: 0,
      }
      const newScale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale: newScale })
      expect(newState.scale).toBe(newScale)
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(100)
      expect(newState.scrollTopAnchor).toBe(200)
      expect(newState.localOffset).toBe(0)
    })
  })

  describe('LOCAL_SCROLL action', () => {
    it('adds delta to localOffset', () => {
      const initialState = initializeScrollState()
      const newState = scrollReducer(initialState, { type: 'LOCAL_SCROLL', delta: 50 })
      expect(newState.localOffset).toBe(50)
    })

    it('accumulates delta on multiple LOCAL_SCROLL actions', () => {
      const initialState = initializeScrollState()
      const stateAfterFirstDelta = scrollReducer(initialState, { type: 'LOCAL_SCROLL', delta: 30 })
      const stateAfterSecondDelta = scrollReducer(stateAfterFirstDelta, { type: 'LOCAL_SCROLL', delta: 20 })
      expect(stateAfterSecondDelta.localOffset).toBe(50)
    })

    it('does not modify other state properties when adding delta', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createVirtualScale(),
        scrollTop: 100,
        scrollTopAnchor: 200,
        localOffset: 10,
      }
      const newState = scrollReducer(initialState, { type: 'LOCAL_SCROLL', delta: 15 })
      expect(newState.localOffset).toBe(25)
      expect(newState.isScrolling).toBe(true)
      expect(newState.scale).toBe(initialState.scale)
      expect(newState.scrollTop).toBe(100)
      expect(newState.scrollTopAnchor).toBe(200)
    })
  })

  describe('GLOBAL_SCROLL action', () => {
    const virtualScale = createVirtualScale()
    const maxScrollTop = virtualScale.canvasHeight - virtualScale.parameters.clientHeight
    it.each([
      [-10, 0],
      [0, 0],
      [50, 50],
      [maxScrollTop - 50, maxScrollTop - 50],
      [maxScrollTop, maxScrollTop],
      [maxScrollTop + 10, maxScrollTop],
    ])('sets scrollTop, clamps scrollTopAnchor, and resets localOffset, when scrollTop is %d', (scrollTop, expectedGlobalAnchor) => {
      const initialState = {
        scale: virtualScale,
        // arbitrary initial values
        isScrolling: true,
        scrollTop: 150,
        scrollTopAnchor: 800,
        localOffset: 120,
      }
      const newState = scrollReducer(initialState, { type: 'GLOBAL_SCROLL', scrollTop })
      expect(newState.scrollTop).toBe(scrollTop)
      expect(newState.scrollTopAnchor).toBe(expectedGlobalAnchor)
      expect(newState.localOffset).toBe(0)
    })
  })

  describe('SCROLL_TO action', () => {
    it.each([undefined, 'normal', 'virtual'])('globally scrolls and sets isScrolling to true if scale is %s', (scale) => {
      const initialState = {
        isScrolling: false,
        scale: scale === 'normal' ? createNormalScale() : scale === 'virtual' ? createVirtualScale() : undefined,
        scrollTop: 150,
        scrollTopAnchor: 800,
        localOffset: 120,
      }
      const newState = scrollReducer(initialState, { type: 'SCROLL_TO', scrollTop: 250 })
      expect(newState.scrollTop).toBe(250)
      expect(newState.scrollTopAnchor).toBe(250)
      expect(newState.localOffset).toBe(0)
      expect(newState.isScrolling).toBe(true)
    })
  })

  describe('ON_SCROLL action', () => {
    const initialScrollTop = 100
    const farScrollTop = initialScrollTop + 50000
    const nearScrollTop = initialScrollTop + 200
    const initialState = {
      isScrolling: true,
      scale: createVirtualScale(),
      scrollTop: initialScrollTop,
      scrollTopAnchor: initialScrollTop,
      localOffset: 200,
    }

    it.each([true, false])('is run, without checking the value of isScrolling', (isScrolling) => {
      const newState = scrollReducer({ ...initialState, isScrolling }, { type: 'ON_SCROLL', scrollTop: farScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(farScrollTop)
      expect(newState.scrollTopAnchor).toBe(farScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls locally when possible in virtual scrolling mode', () => {
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(initialState.scrollTopAnchor) // unchanged
      expect(newState.localOffset).toBe(400)
    })

    it('scrolls globally when scrollTopAnchor is undefined', () => {
      const newState = scrollReducer({ ...initialState, scrollTopAnchor: undefined }, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(nearScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally when the previous scrollTop is undefined', () => {
      const newState = scrollReducer({ ...initialState, scrollTop: undefined }, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(nearScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally when scale is undefined', () => {
      const newState = scrollReducer({ ...initialState, scale: undefined }, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(nearScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally when the scale is in normal mode', () => {
      const normalScaleState = { ...initialState, scale: createNormalScale() }
      const newState = scrollReducer(normalScaleState, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(nearScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally when the scrollTop change is too large', () => {
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: farScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(farScrollTop)
      expect(newState.scrollTopAnchor).toBe(farScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally when the accumulated localOffset would be too large', () => {
      const stateWithLargeLocalOffset: ScrollState = {
        ...initialState,
        localOffset: 16_499, // below the largeScrollPx threshold (500 * 33 = 16,500)
      }
      const newState = scrollReducer(stateWithLargeLocalOffset, { type: 'ON_SCROLL', scrollTop: nearScrollTop })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(nearScrollTop)
      expect(newState.scrollTopAnchor).toBe(nearScrollTop)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally, and scrollTopAnchor is clamped, when scrollTop is non-positive', () => {
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: -50 })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(-50)
      expect(newState.scrollTopAnchor).toBe(0)
      expect(newState.localOffset).toBe(0)
    })

    it('scrolls globally, and scrollTopAnchor is clamped, when scrollTop is too large', () => {
      const maxScrollTop = initialState.scale.canvasHeight - initialState.scale.parameters.clientHeight
      const newState = scrollReducer({
        ...initialState,
        scrollTop: maxScrollTop - 100,
        scrollTopAnchor: maxScrollTop - 100,
      }, { type: 'ON_SCROLL', scrollTop: maxScrollTop + 100 })
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(maxScrollTop + 100)
      expect(newState.scrollTopAnchor).toBe(maxScrollTop)
      expect(newState.localOffset).toBe(0)
    })
  })
})
