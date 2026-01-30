import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useInputOrDisabledState, useInputState } from '../../src/hooks/useInputState.js'

describe('useInputOrDisabledState', () => {
  describe('in controlled mode (value is defined), ', () => {
    const value = 'value'
    const onChange = vi.fn()
    const defaultValue = 'default'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value, onChange, defaultValue }))
      expect(result.current?.onChange).toBeDefined()
    })

    it('the initial value is value, not defaultValue', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value, onChange, defaultValue }))
      expect(result.current?.value).toBe(value)
    })

    it('the onChange prop is called on input change and the value remains to the prop value', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value, onChange, defaultValue }))
      act(() => {
        result.current?.onChange?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      expect(result.current?.value).toBe(value)
    })

    it('if the onChange prop is undefined, the value remains to the prop value on input change, and the interactions are disabled', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value, defaultValue }))
      expect(result.current?.onChange).toBeUndefined()
    })

    it('the value is disabled if value and onChange are undefined', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value: undefined, onChange: undefined, defaultValue }))
      expect(result.current).toBeUndefined()
    })

    it('the prop value cannot be set to undefined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputOrDisabledState({ value, onChange, defaultValue }))
      act(() => {
        rerender({ value: undefined, onChange })
      })
      expect(onChange).not.toHaveBeenCalled()
      expect(result.current?.value).toBe(value)
    })
  })

  describe('in uncontrolled mode (value is undefined), ', () => {
    const onChange = vi.fn()
    const value = 'value'
    const defaultValue = 'default'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ onChange, defaultValue }))
      expect(result.current?.onChange).toBeDefined()
    })

    it('the initial value is defaultValue', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ onChange, defaultValue }))
      expect(result.current?.value).toBe(defaultValue)
    })

    it('the prop onChange function is called on input change and the value is set to the new value', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ onChange, defaultValue }))
      act(() => {
        result.current?.onChange?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      expect(result.current?.value).toBe(newValue)
    })

    it('the value is disabled if value and onChange are undefined', () => {
      const { result } = renderHook(() => useInputOrDisabledState({ value: undefined, onChange: undefined, defaultValue }))
      expect(result.current).toBeUndefined()
    })

    it('the prop value cannot be defined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputOrDisabledState({ onChange, defaultValue: undefined }))
      act(() => {
        rerender({ value, onChange })
      })
      expect(onChange).not.toHaveBeenCalled()
      expect(result.current?.value).toBeUndefined()
    })
  })
})

describe('useInputState', () => {
  describe('in controlled mode (value is defined), ', () => {
    const value = 'value'
    const onChange = vi.fn()
    const defaultValue = 'default'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputState({ value, onChange, defaultValue }))
      expect(result.current.onChange).toBeDefined()
    })

    it('the initial value is value, not defaultValue', () => {
      const { result } = renderHook(() => useInputState({ value, onChange, defaultValue }))
      expect(result.current.value).toBe(value)
    })

    it('the onChange prop is called on input change and the value remains to the prop value', () => {
      const { result } = renderHook(() => useInputState({ value, onChange, defaultValue }))
      act(() => {
        result.current.onChange?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      expect(result.current.value).toBe(value)
    })

    it('if the onChange prop is undefined, the value remains to the prop value on input change, and the interactions are disabled', () => {
      const { result } = renderHook(() => useInputState({ value, defaultValue }))
      expect(result.current.onChange).toBeUndefined()
    })

    it('the prop value cannot be set to undefined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputState({ value, onChange, defaultValue }))
      act(() => {
        rerender({ value: undefined, onChange })
      })
      expect(onChange).not.toHaveBeenCalled()
      expect(result.current.value).toBe(value)
    })
  })

  describe('in uncontrolled mode (value is undefined), ', () => {
    const onChange = vi.fn()
    const value = 'value'
    const defaultValue = 'default'
    const newValue = 'new value'

    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('the interactions are enabled', () => {
      const { result } = renderHook(() => useInputState({ onChange, defaultValue }))
      expect(result.current.onChange).toBeDefined()
    })

    it('the initial value is defaultValue', () => {
      const { result } = renderHook(() => useInputState({ onChange, defaultValue }))
      expect(result.current.value).toBe(defaultValue)
    })

    it('the prop onChange function is called on input change and the value is set to the new value', () => {
      const { result } = renderHook(() => useInputState({ onChange, defaultValue }))
      act(() => {
        result.current.onChange?.(newValue)
      })
      expect(onChange).toHaveBeenCalledWith(newValue)
      expect(result.current.value).toBe(newValue)
    })

    it('the prop value cannot be defined afterwards', () => {
      const { result, rerender } = renderHook(() => useInputState({ onChange, defaultValue: undefined }))
      act(() => {
        rerender({ value, onChange })
      })
      expect(onChange).not.toHaveBeenCalled()
      expect(result.current.value).toBeUndefined()
    })
  })
})
