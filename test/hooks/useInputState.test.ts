import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useInputState } from '../../src/hooks/useInputState.js'

describe('useInputState', () => {
  describe('in controlled mode (controlledValue is defined), ', () => {
    const controlledValue = 'controlled value'
    const onChange = vi.fn()
    const initialUncontrolledValue = 'initial uncontrolled value'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toBeDefined()
    })

    it('the initial value is controlledValue, not initialUncontrolledValue', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      const [value] = result.current
      expect(value).toBe(controlledValue)
    })

    it('the onChange prop is called on input change and the value remains to the prop controlledValue', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      const [value] = result.current
      expect(value).toBe(controlledValue)
    })

    it('if the onChange prop is undefined, the value remains to the prop controlledValue on input change, and the interactions are disabled', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toBeUndefined()
    })

    it('the prop controlledValue cannot be set to undefined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      act(() => {
        rerender({ controlledValue: undefined, onChange, initialUncontrolledValue })
      })
      expect(onChange).not.toHaveBeenCalled()
      const [value] = result.current
      expect(value).toBe(controlledValue)
    })
  })

  describe('in uncontrolled mode (controlledValue is undefined), ', () => {
    const onChange = vi.fn()
    const controlledValue = 'controlled value'
    const initialUncontrolledValue = 'initial uncontrolled value'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toBeDefined()
    })

    it('the initial value is initialUncontrolledValue', () => {
      const { result } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      const [value] = result.current
      expect(value).toBe(initialUncontrolledValue)
    })

    it('the prop onChange function is called on input change and the value is set to the new value', () => {
      const { result } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      const [value] = result.current
      expect(value).toBe(newValue)
    })

    it('the prop controlledValue cannot be defined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      act(() => {
        rerender({ controlledValue, onChange, initialUncontrolledValue })
      })
      expect(onChange).not.toHaveBeenCalled()
      const [value] = result.current
      expect(value).toBe(initialUncontrolledValue)
    })
  })
})
