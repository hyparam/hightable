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
      virtualScrollBase: 600,
      virtualScrollDelta: 150,
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
      virtualScrollBase: 2_000,
      virtualScrollDelta: 0,
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
      virtualScrollBase: 0,
      virtualScrollDelta: 0,
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
      virtualScrollBase: undefined,
      virtualScrollDelta: 0,
    })
  })
})

describe('getScrollActionForRow', () => {
  describe('in normal scrolling mode (scale.factor = 1)', () => {
    it.each([
      { rowIndex: 1, virtualScrollBase: 0 },
      { rowIndex: 10, virtualScrollBase: 100 },
      { rowIndex: 50, virtualScrollBase: 1_000 },
    ])('returns undefined if the row is already in view', ({ rowIndex, virtualScrollBase }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta: 0 })
      expect(action).toBeUndefined()
    })

    it.each([
      { rowIndex: 2, virtualScrollBase: 500, expectedScrollTop: 0 },
      { rowIndex: 500, virtualScrollBase: 0, expectedScrollTop: 15_517 },
      { rowIndex: 800, virtualScrollBase: 0, expectedScrollTop: 25_417 },
      { rowIndex: 800, virtualScrollBase: 25_000, expectedScrollTop: 25_417 },
    ])('returns a scrollTop action to scroll to the row in all the cases, small or large scroll (%o)', ({ rowIndex, virtualScrollBase, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta: 0 })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it.each([
      { rowIndex: 500, virtualScrollBase: 0, expectedScrollTop: 15_517 },
      { rowIndex: 500, virtualScrollBase: 30_000, expectedScrollTop: 16_434 },
    ])('returns different scrollTop value if the current row was before or after the next one (nearest neighbor) (%o)', ({ rowIndex, virtualScrollBase, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta: 0 })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(expectedScrollTop, 0)
    })

    it.each([
      // would be a delta, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 500 },
      // would be a scrollTop, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 50_000 },
    ])('returns undefined if the rowIndex is the header, because it is always in view (%o)', ({ rowIndex, virtualScrollBase }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 1_000_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta: 0 })
      expect(action).toBeUndefined()
    })
  })

  describe('in virtual scrolling mode (scale.factor > 1)', () => {
    it.each([
      { rowIndex: 1, virtualScrollBase: 0, virtualScrollDelta: 0 },
      { rowIndex: 2, virtualScrollBase: 0, virtualScrollDelta: 0 },
      { rowIndex: 10, virtualScrollBase: 100, virtualScrollDelta: 0 },
      { rowIndex: 10, virtualScrollBase: 100, virtualScrollDelta: -100 },
      { rowIndex: 50, virtualScrollBase: 1_000, virtualScrollDelta: 200 },
    ])('returns undefined if the row is already in view', ({ rowIndex, virtualScrollBase, virtualScrollDelta }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta })
      expect(action).toBeUndefined()
    })

    it.each([
      { rowIndex: 5, virtualScrollBase: 500, virtualScrollDelta: 0, expectedDelta: -401 },
      { rowIndex: 500, virtualScrollBase: 0, virtualScrollDelta: 0, expectedDelta: 15_517 },
      { rowIndex: 500, virtualScrollBase: 1_000, virtualScrollDelta: 1_000, expectedDelta: 13_517 },
    ])('returns a delta action (positive or negative) to scroll to the row when a small scroll is needed (%o)', ({ rowIndex, virtualScrollBase, virtualScrollDelta, expectedDelta }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta })
      expect(action).toEqual({ delta: expectedDelta })
    })

    it.each([
      { rowIndex: 2, virtualScrollBase: 50_000, virtualScrollDelta: 0, expectedScrollTop: 0 },
      { rowIndex: 800, virtualScrollBase: 0, virtualScrollDelta: 0, expectedScrollTop: 7_137 },
    ])('returns a scrollTop action to scroll to the row when a large scroll is needed (%o)', ({ rowIndex, virtualScrollBase, virtualScrollDelta, expectedScrollTop }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta })
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
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta: 0 })
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
      const virtualScrollDelta = 16_500 // below the largeScrollPx threshold (16,500)
      const rowIndex = 600
      const virtualScrollBase = 0
      // should add a small delta (2_317), but the accumulated delta (18_817) exceeds largeScrollPx, so: scrollTop is returned to synchronize properly
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta })
      if (!action || !('scrollTop' in action)) {
        throw new Error('Expected a scrollTop action')
      }
      expect(action.scrollTop).toBeCloseTo(5_284, 0)
    })

    it.each([
    // would be a delta, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 500, virtualScrollDelta: 0, expectedDelta: -401 },
      // would be a scrollTop, but rowIndex 1 is the header
      { rowIndex: 1, virtualScrollBase: 50_000, virtualScrollDelta: 0 },
    ])('returns undefined if the rowIndex is the header, because it is always in view (%o)', ({ rowIndex, virtualScrollBase, virtualScrollDelta }) => {
      const scale = createScale({
        clientHeight: 1_000,
        headerHeight: 50,
        maxElementHeight: 10_000,
        numRows: 1_000,
        rowHeight: 33,
      })
      const action = getScrollActionForRow({ scale, rowIndex, virtualScrollBase, virtualScrollDelta })
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
    maxElementHeight: 10_000,
    numRows: 1_000,
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
      expect(newState.virtualScrollBase).toBeUndefined()
      expect(newState.virtualScrollDelta).toBe(0)
    })

    it('does not change other state properties when setting scale', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: undefined,
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 10,
      }
      const scale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(true)
      expect(newState.scrollTop).toBe(100)
      expect(newState.virtualScrollBase).toBe(200)
      expect(newState.virtualScrollDelta).toBe(10)
    })

    // TODO(SL): maybe it should reset virtualScrollBase and virtualScrollDelta if the scale changes
    it('does not change other state properties when updating scale', () => {
      const initialState: ScrollState = {
        isScrolling: false,
        scale: createNormalScale(),
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 0,
      }
      const newScale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale: newScale })
      expect(newState.scale).toBe(newScale)
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(100)
      expect(newState.virtualScrollBase).toBe(200)
      expect(newState.virtualScrollDelta).toBe(0)
    })

    it('computes virtualScrollBase if needed and scrollTop is defined', () => {
      const initialState = {
        ...initializeScrollState(),
        scrollTop: 150,
      }
      const scale = createNormalScale()
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(150)
      expect(newState.virtualScrollBase).toBe(150)
      expect(newState.virtualScrollDelta).toBe(0)
    })
  })

  describe('ADD_DELTA action', () => {
    it('adds delta to virtualScrollDelta', () => {
      const initialState = initializeScrollState()
      const newState = scrollReducer(initialState, { type: 'ADD_DELTA', delta: 50 })
      expect(newState.virtualScrollDelta).toBe(50)
    })

    it('accumulates delta on multiple ADD_DELTA actions', () => {
      const initialState = initializeScrollState()
      const stateAfterFirstDelta = scrollReducer(initialState, { type: 'ADD_DELTA', delta: 30 })
      const stateAfterSecondDelta = scrollReducer(stateAfterFirstDelta, { type: 'ADD_DELTA', delta: 20 })
      expect(stateAfterSecondDelta.virtualScrollDelta).toBe(50)
    })

    it('does not modify other state properties when adding delta', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createVirtualScale(),
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 10,
      }
      const newState = scrollReducer(initialState, { type: 'ADD_DELTA', delta: 15 })
      expect(newState.virtualScrollDelta).toBe(25)
      expect(newState.isScrolling).toBe(true)
      expect(newState.scale).toBe(initialState.scale)
      expect(newState.scrollTop).toBe(100)
      expect(newState.virtualScrollBase).toBe(200)
    })
  })

  describe('SCROLL_TO action', () => {
    it('sets scrollTop, sets isScrolling to true, resets virtualScrollDelta and compute virtualScrollBase if scale is defined', () => {
      const initialState = {
        isScrolling: false,
        scale: createNormalScale(),
        scrollTop: 150,
        virtualScrollBase: 800,
        virtualScrollDelta: 120,
      }
      const newState = scrollReducer(initialState, { type: 'SCROLL_TO', scrollTop: 250 })
      expect(newState.scrollTop).toBe(250)
      expect(newState.virtualScrollBase).toBe(250)
      expect(newState.virtualScrollDelta).toBe(0)
      expect(newState.isScrolling).toBe(true)
    })

    it('sets scrollTop, sets isScrolling to true, resets virtualScrollDelta and compute virtualScrollBase if scale is defined and virtual', () => {
      const initialState = {
        isScrolling: false,
        scale: createVirtualScale(),
        scrollTop: 150,
        virtualScrollBase: 800,
        virtualScrollDelta: 120,
      }
      const newState = scrollReducer(initialState, { type: 'SCROLL_TO', scrollTop: 250 })
      expect(newState.scrollTop).toBe(250)
      expect(newState.virtualScrollBase).toBeCloseTo(890, 0) // 250 * factor
      expect(newState.virtualScrollDelta).toBe(0)
      expect(newState.isScrolling).toBe(true)
    })

    it('sets scrollTop, sets isScrolling to true, resets virtualScrollDelta and undefine virtualScrollBase if scale is undefined', () => {
      const initialState = {
        isScrolling: false,
        scale: undefined,
        scrollTop: 150,
        virtualScrollBase: 800,
        virtualScrollDelta: 120,
      }
      const newState = scrollReducer(initialState, { type: 'SCROLL_TO', scrollTop: 250 })
      expect(newState.scrollTop).toBe(250)
      expect(newState.virtualScrollBase).toBeUndefined()
      expect(newState.virtualScrollDelta).toBe(0)
      expect(newState.isScrolling).toBe(true)
    })
  })

  describe('ON_SCROLL action', () => {
    it('only sets scrollTop and isScrolling when virtualScrollBase and scale are undefined', () => {
      const initialState = {
        isScrolling: true,
        scale: undefined,
        scrollTop: undefined,
        virtualScrollBase: undefined,
        virtualScrollDelta: 0,
      }
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
      expect(newState.scrollTop).toBe(300)
      expect(newState.isScrolling).toBe(false)
      expect(newState.virtualScrollBase).toBeUndefined()
      expect(newState.virtualScrollDelta).toBe(0)
    })

    it('does not depend on the previous value of isScrolling, and sets scrollTop and isScrolling', () => {
      const initialState: ScrollState = {
        isScrolling: false,
        scale: undefined,
        scrollTop: 100,
        virtualScrollBase: undefined,
        virtualScrollDelta: 0,
      }
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
      expect(newState.scrollTop).toBe(300)
      expect(newState.isScrolling).toBe(false)
      expect(newState.virtualScrollBase).toBeUndefined()
      expect(newState.virtualScrollDelta).toBe(0)
    })

    describe('in normal scrolling mode (scale.factor = 1)', () => {
      const scale = createNormalScale()

      it('only sets scrollTop and isScrolling when virtualScrollBase is defined and scrollTop was undefined', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: undefined,
          virtualScrollBase: 400,
          virtualScrollDelta: 0,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
        expect(newState.scrollTop).toBe(300)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(400)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('sets scrollTop and isScrolling, keeps virtualScrollDelta, and computes virtualScrollBase when virtualScrollBase is undefined but scale is defined', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: undefined,
          virtualScrollDelta: 30,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
        expect(newState.scrollTop).toBe(300)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(270) // 300 - 30
        expect(newState.virtualScrollDelta).toBe(30)
      })

      it('computes a new virtualScrollBase and resets virtualScrollDelta when scrollTop change is significant', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 20_000 })
        expect(newState.scrollTop).toBe(20_000)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(20_000)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('computes a new virtualScrollBase and resets virtualScrollDelta when accumulated virtual scroll delta is significant', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20_000,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 150 })
        expect(newState.scrollTop).toBe(150)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(150)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it.each([-10_000, -1, 0])('sets virtualScrollTop to the new value and resets virtualScrollDelta when scrollTop is non-positive (%i)', (scrollTop) => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 50,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop })
        expect(newState.scrollTop).toBe(scrollTop)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(scrollTop)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it.each([0, 1, 10_000])('sets a virtualScrollBase to scrollTop and resets virtualScrollDelta when scrollTop is too large (max + %i)', (excess) => {
        const maxScrollTop = scale.canvasHeight - scale.parameters.clientHeight
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 50,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: maxScrollTop + excess })
        expect(newState.scrollTop).toBe(maxScrollTop + excess)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(maxScrollTop + excess)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('sets a virtualScrollBase and resets virtualScrollDelta (+ sets scrollTop and isScrolling) even if scrollTop change is minor', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 150 })
        expect(newState.scrollTop).toBe(150)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(150)
        expect(newState.virtualScrollDelta).toBe(0)
      })
    })

    describe('in virtual scrolling mode (scale.factor > 1)', () => {
      const scale = createVirtualScale()

      it('only sets scrollTop and isScrolling when virtualScrollBase is defined and scrollTop was undefined', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: undefined,
          virtualScrollBase: 400,
          virtualScrollDelta: 0,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
        expect(newState.scrollTop).toBe(300)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(400)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('sets scrollTop and isScrolling, keeps virtualScrollDelta, and computes virtualScrollBase when virtualScrollBase is undefined but scale is defined', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: undefined,
          virtualScrollDelta: 30,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
        expect(newState.scrollTop).toBe(300)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBeCloseTo(1_038, 0) // 300 * factor - 30
        expect(newState.virtualScrollDelta).toBe(30)
      })

      it('computes a new virtualScrollBase and resets virtualScrollDelta when scrollTop change is significant', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 20_000 })
        expect(newState.scrollTop).toBe(20_000)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBeCloseTo(32_050, 0) // 20_000 * factor
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('computes a new virtualScrollBase and resets virtualScrollDelta when accumulated virtual scroll delta is significant', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20_000,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 150 })
        expect(newState.scrollTop).toBe(150)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBeCloseTo(534, 0) // 150 * factor
        expect(newState.virtualScrollDelta).toBe(0)
      })

      // TODO(SL): set virtualScrollBase to the negative scrollTop?
      it.each([-10_000, -1, 0])('sets a virtualScrollBase to 0 and resets virtualScrollDelta when scrollTop is non-positive (%i)', (scrollTop) => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 50,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop })
        expect(newState.scrollTop).toBe(scrollTop)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(0)
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it.each([0, 1, 10_000])('sets a virtualScrollBase to max and resets virtualScrollDelta when scrollTop is too large (max + %i)', (excess) => {
        const maxScrollTop = scale.canvasHeight - scale.parameters.clientHeight
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 50,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: maxScrollTop + excess })
        expect(newState.scrollTop).toBe(maxScrollTop + excess)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(scale.toVirtual(maxScrollTop))
        expect(newState.virtualScrollDelta).toBe(0)
      })

      it('keeps virtualScrollBase and only updates virtualScrollDelta (+ sets scrollTop and isScrolling) when scrollTop change is minor', () => {
        const initialState: ScrollState = {
          isScrolling: true,
          scale,
          scrollTop: 100,
          virtualScrollBase: 200,
          virtualScrollDelta: 20,
        }
        const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 150 })
        expect(newState.scrollTop).toBe(150)
        expect(newState.isScrolling).toBe(false)
        expect(newState.virtualScrollBase).toBe(200)
        expect(newState.virtualScrollDelta).toBe(70) // 20 + (150 - 100) <- the delta is added in the virtual space, to get a local scroll behavior
      })
    })
  })
})
