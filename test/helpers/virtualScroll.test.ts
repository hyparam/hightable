import { describe, expect, it } from 'vitest'

import type { Scale, ScrollState } from '../../src/helpers/virtualScroll.js'
import { computeDerivedValues, createScale, initializeScrollState, scrollReducer } from '../../src/helpers/virtualScroll.js'

function createFakeScale(factor: number): Scale {
  return {
    toVirtual: (scrollTop: number) => scrollTop * factor,
    fromVirtual: (virtualScrollTop: number) => virtualScrollTop / factor,
    factor,
    // the following values are arbitrary for the tests
    virtualCanvasHeight: 200_000,
    parameters: {
      rowHeight: 20,
      headerHeight: 50,
      numRows: 10_000,
      canvasHeight: 30_000,
      clientHeight: 1000,
    },
  }
}

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

describe('scrollReducer', () => {
  describe('SET_SCALE action', () => {
    it('sets the scale in the state', () => {
      const initialState = initializeScrollState()
      const scale = createFakeScale(2)
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
      const scale = createFakeScale(2)
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(true)
      expect(newState.scrollTop).toBe(100)
      expect(newState.virtualScrollBase).toBe(200)
      expect(newState.virtualScrollDelta).toBe(10)
    })

    it('does not change other state properties when updating scale', () => {
      const initialState: ScrollState = {
        isScrolling: false,
        scale: createFakeScale(2),
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 0,
      }
      const newScale = createFakeScale(3)
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
      const scale = createFakeScale(2)
      const newState = scrollReducer(initialState, { type: 'SET_SCALE', scale })
      expect(newState.scale).toBe(scale)
      expect(newState.isScrolling).toBe(false)
      expect(newState.scrollTop).toBe(150)
      expect(newState.virtualScrollBase).toBe(300) // 150 * 2
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
        scale: createFakeScale(2),
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
        scale: createFakeScale(2),
        scrollTop: 150,
        virtualScrollBase: 800,
        virtualScrollDelta: 120,
      }
      const newState = scrollReducer(initialState, { type: 'SCROLL_TO', scrollTop: 250 })
      expect(newState.scrollTop).toBe(250)
      expect(newState.virtualScrollBase).toBe(500)
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

    it('sets scrollTop and isScrolling, even if isScrolling was already false', () => {
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

    it('only sets scrollTop and isScrolling when virtualScrollBase is defined and scrollTop was undefined', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createFakeScale(2),
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
        scale: createFakeScale(2),
        scrollTop: 100,
        virtualScrollBase: undefined,
        virtualScrollDelta: 30,
      }
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 300 })
      expect(newState.scrollTop).toBe(300)
      expect(newState.isScrolling).toBe(false)
      expect(newState.virtualScrollBase).toBe(570) // 300 * 2 - 30
      expect(newState.virtualScrollDelta).toBe(30)
    })

    it('computes a new virtualScrollBase and resets virtualScrollDelta when scrollTop change is significant', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createFakeScale(2),
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 20,
      }
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 20_000 })
      expect(newState.scrollTop).toBe(20_000)
      expect(newState.isScrolling).toBe(false)
      expect(newState.virtualScrollBase).toBe(40_000) // 20_000 * 2
      expect(newState.virtualScrollDelta).toBe(0)
    })

    it('computes a new virtualScrollBase and resets virtualScrollDelta when accumulated virtual scroll delta is significant', () => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createFakeScale(2),
        scrollTop: 100,
        virtualScrollBase: 200,
        virtualScrollDelta: 20_000,
      }
      const newState = scrollReducer(initialState, { type: 'ON_SCROLL', scrollTop: 150 })
      expect(newState.scrollTop).toBe(150)
      expect(newState.isScrolling).toBe(false)
      expect(newState.virtualScrollBase).toBe(300) // 150 * 2
      expect(newState.virtualScrollDelta).toBe(0)
    })

    it.each([-10_000, -1, 0])('sets a virtualScrollBase to 0 and resets virtualScrollDelta when scrollTop is non-positive (%i)', (scrollTop) => {
      const initialState: ScrollState = {
        isScrolling: true,
        scale: createFakeScale(2),
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
      const scale = createFakeScale(2)
      const maxScrollTop = scale.parameters.canvasHeight - scale.parameters.clientHeight
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
        scale: createFakeScale(2),
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

describe('createScale', () => {
  it('creates a scale with the correct factor and dimensions', () => {
    const parameters = {
      canvasHeight: 10_000,
      clientHeight: 500,
      headerHeight: 50,
      numRows: 1_000,
      rowHeight: 20,
    }
    const scale = createScale(parameters)
    expect(scale.parameters).toEqual(parameters)
    expect(scale.virtualCanvasHeight).toBe(20_050) // headerHeight + numRows * rowHeight
    expect(scale.factor).toBeCloseTo(2.057)
    expect(scale.toVirtual(0)).toBe(0)
    expect(scale.toVirtual(100)).toBeCloseTo(205.789)
    expect(scale.fromVirtual(0)).toBe(0)
    expect(scale.fromVirtual(2_000)).toBeCloseTo(971.867)
  })

  it.each([
    { headerHeight: 0, rowHeight: 20, canvasHeight: 10_000 },
    { headerHeight: 50, rowHeight: 0, canvasHeight: 10_000 },
    { headerHeight: 50, rowHeight: 20, canvasHeight: 0 },
    { headerHeight: -10, rowHeight: 20, canvasHeight: 10_000 },
    { headerHeight: 50, rowHeight: -5, canvasHeight: 10_000 },
    { headerHeight: 50, rowHeight: 20, canvasHeight: -100 },
  ])('throws if headerHeight, rowHeight or canvasHeight are non-positive (%o)', (params) => {
    const parameters = {
      clientHeight: 500,
      numRows: 1_000,
      ...params,
    }
    expect(() => createScale(parameters)).toThrow()
  })

  it.each([-1, 1.5])('throws if numRows is negative or non-integer', (numRows) => {
    const parameters = {
      canvasHeight: 10_000,
      clientHeight: 500,
      headerHeight: 50,
      rowHeight: 20,
      numRows,
    }
    expect(() => createScale(parameters)).toThrow()
  })

  it('handles the case with zero rows', () => {
    const parameters = {
      canvasHeight: 1_000,
      clientHeight: 20,
      headerHeight: 50,
      rowHeight: 20,
      numRows: 0,
    }
    const scale = createScale(parameters)
    expect(scale.parameters).toEqual(parameters)
    expect(scale.virtualCanvasHeight).toBe(50) // headerHeight + numRows * rowHeight
    expect(scale.factor).toBeCloseTo(0.03)
  })

  it.each([499, 500])('throws if canvasHeight is less than or equal to clientHeight', (canvasHeight) => {
    const parameters = {
      canvasHeight,
      clientHeight: 500,
      headerHeight: 50,
      rowHeight: 20,
      numRows: 1_000,
    }
    expect(() => createScale(parameters)).toThrow()
  })

  it('throws if virtualCanvasHeight is less than or equal to clientHeight', () => {
    const parameters = {
      canvasHeight: 10_000,
      clientHeight: 5_000,
      headerHeight: 50,
      rowHeight: 4,
      numRows: 10,
    }
    expect(() => createScale(parameters)).toThrow()
  })
})

describe('computeDerivedValues', () => {
  it('computes derived values correctly', () => {
    const scale = createScale({
      clientHeight: 1_000,
      canvasHeight: 10_000,
      headerHeight: 50,
      rowHeight: 30,
      numRows: 20_000,
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

  it('adds padding only when possible', () => {
    const scale = createScale({
      clientHeight: 1_000,
      canvasHeight: 10_000,
      headerHeight: 50,
      rowHeight: 30,
      numRows: 100,
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
