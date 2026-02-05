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

    it('if onChange is undefined, the state setter is undefined', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toBeUndefined()
    })

    it('if onChange is defined, the state setter is equal to onChange, and thus onChange is called when setting a new value', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toEqual(onChange)
      act(() => {
        setValue?.(newValue)
      })
      expect(onChange).toHaveBeenCalledExactlyOnceWith(newValue)
    })

    it('onChange is not called when controlledValue changes', () => {
      const { rerender } = renderHook(({ controlledValue }) => useInputState({ controlledValue, onChange, initialUncontrolledValue }), { initialProps: { controlledValue } })
      act(() => {
        rerender({ controlledValue: newValue })
      })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('the initial state value is controlledValue, not initialUncontrolledValue', () => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue }))
      const [value] = result.current
      expect(value).toBe(controlledValue)
      expect(value).not.toBe(initialUncontrolledValue)
    })

    it.each([onChange, undefined])('after calling the state setter, the value is still controlledValue (as the state is controlled), no matter the value of onChange', (onChangeProp) => {
      const { result } = renderHook(() => useInputState({ controlledValue, onChange: onChangeProp, initialUncontrolledValue }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      const [value] = result.current
      expect(value).toBe(controlledValue)
    })

    it.each([onChange, undefined])('controlledValue cannot be set to undefined afterwards, no matter the value of onChange', (onChangeProp) => {
      const { result, rerender } = renderHook(() => useInputState({ controlledValue, onChange: onChangeProp, initialUncontrolledValue }))
      act(() => {
        rerender({ controlledValue: undefined, onChange: onChangeProp, initialUncontrolledValue })
      })
      const [value] = result.current
      expect(value).toBe(controlledValue)
    })

    it.each([onChange, undefined])('notifyChange is not called on init, no matter the value of onChange', (onChangeProp) => {
      const notifyChange = vi.fn()
      renderHook(() => useInputState({ controlledValue, onChange: onChangeProp, initialUncontrolledValue, notifyChange }))
      expect(notifyChange).not.toHaveBeenCalled()
    })

    it.each([onChange, undefined])('notifyChange is called when the controlledValue changes, no matter the value of onChange', (onChangeProp) => {
      const notifyChange = vi.fn()
      const { rerender } = renderHook(({ controlledValue }) => useInputState({ controlledValue, onChange: onChangeProp, initialUncontrolledValue, notifyChange }), { initialProps: { controlledValue } })
      act(() => {
        rerender({ controlledValue: newValue })
      })
      expect(notifyChange).toHaveBeenCalledExactlyOnceWith()
    })

    it('notifyChange is not called when setting the state (ie. calling onChange)', () => {
      const notifyChange = vi.fn()
      const { result } = renderHook(() => useInputState({ controlledValue, onChange, initialUncontrolledValue, notifyChange }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      expect(notifyChange).not.toHaveBeenCalled()
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

    it.each([onChange, undefined])('a state setter is returned and updates the state value, no matter the value of onChange', (onChangeProp) => {
      const { result } = renderHook(() => useInputState({ onChange: onChangeProp, initialUncontrolledValue }))
      const [, setValue] = result.current
      expect(setValue).toBeDefined()
      act(() => {
        setValue?.(newValue)
      })
      const [value] = result.current
      expect(value).toBe(newValue)
    })

    it('if onChange is defined, it is called on input change', () => {
      const { result } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      expect(onChange).toHaveBeenCalledExactlyOnceWith(newValue)
    })

    it.each([onChange, undefined])('the initial value is initialUncontrolledValue, no matter the value of onChange', (onChangeProp) => {
      const { result } = renderHook(() => useInputState({ onChange: onChangeProp, initialUncontrolledValue }))
      const [value] = result.current
      expect(value).toBe(initialUncontrolledValue)
    })

    it.each([onChange, undefined])('if controlledValue is defined afterward, the value is ignored, no matter the value of onChange', (onChangeProp) => {
      const { result, rerender } = renderHook(() => useInputState({ onChange: onChangeProp, initialUncontrolledValue }))
      act(() => {
        rerender({ controlledValue, onChange: onChangeProp, initialUncontrolledValue })
      })
      const [value] = result.current
      expect(value).toBe(initialUncontrolledValue)
    })

    it('if controlledValue is defined afterward, onChange is not called if defined', () => {
      const { rerender } = renderHook(() => useInputState({ onChange, initialUncontrolledValue }))
      act(() => {
        rerender({ controlledValue, onChange, initialUncontrolledValue })
      })
      expect(onChange).not.toHaveBeenCalled()
    })

    it('notifyChange is not called on init', () => {
      const notifyChange = vi.fn()
      renderHook(() => useInputState({ onChange, initialUncontrolledValue, notifyChange }))
      expect(notifyChange).not.toHaveBeenCalled()
    })

    it('notifyChange is called when the value changes', () => {
      const notifyChange = vi.fn()
      const { result } = renderHook(() => useInputState({ onChange, initialUncontrolledValue, notifyChange }))
      const [, setValue] = result.current
      act(() => {
        setValue?.(newValue)
      })
      expect(notifyChange).toHaveBeenCalledExactlyOnceWith()
    })
  })
})
