import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useInputState } from '../../src/hooks/useInputState.js'

describe('in controlled mode (value is defined), ', () => {
  const value = 'value'
  const onChange = vi.fn()
  const defaultValue = 'default'
  const newValue = 'new value'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('the input is controlled', () => {
    const { result } = renderHook(() => useInputState({ value, onChange }))
    expect(result.current.isControlled).toBe(true)
  })

  it('the interactions are enabled', () => {
    const { result } = renderHook(() => useInputState({ value, onChange }))
    expect(result.current.enableInteractions).toBe(true)
  })

  it('the initial value is value, not defaultValue', () => {
    const { result } = renderHook(() => useInputState({ value, onChange, defaultValue }))
    expect(result.current.value).toBe(value)
  })

  it('the onChange prop is called on input change and the value remains to the prop value', () => {
    const { result } = renderHook(() => useInputState({ value, onChange }))
    act(() => {
      result.current.onChange(newValue)
    })
    expect(onChange).toHaveBeenCalledWith(newValue)
    expect(result.current.value).toBe(value)
  })

  it('if the onChange prop is undefined, the value remains to the prop value on input change, and the interactions are disabled', () => {
    const { result } = renderHook(() => useInputState({ value }))
    expect(result.current.enableInteractions).toBe(false)
    act(() => {
      result.current.onChange(newValue)
    })
    expect(result.current.value).toBe(value)
  })

  it('the value is disabled if the "disabled" option is true: value is undefined and props.onChange is not called on input change', () => {
    const { result } = renderHook(() => useInputState({ value, onChange, disabled: true }))
    expect(result.current.value).toBe(undefined)
    expect(result.current.enableInteractions).toBe(false)
    expect(result.current.isControlled).toBe(true)
    act(() => {
      result.current.onChange(newValue)
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('the prop value cannot be set to undefined afterwards', () => {
    const { result, rerender } = renderHook(() => useInputState({ value, onChange }))
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

  it('the input is uncontrolled', () => {
    const { result } = renderHook(() => useInputState({ onChange }))
    expect(result.current.isControlled).toBe(false)
  })

  it('the interactions are enabled', () => {
    const { result } = renderHook(() => useInputState({ onChange }))
    expect(result.current.enableInteractions).toBe(true)
  })

  it('the initial value is defaultValue', () => {
    const { result } = renderHook(() => useInputState({ onChange, defaultValue }))
    expect(result.current.value).toBe(defaultValue)
  })

  it('the initial value, defaultValue, can be undefined', () => {
    const { result } = renderHook(() => useInputState({ onChange }))
    expect(result.current.value).toBe(undefined)
  })

  it('the prop onChange function is called on input change and the value is set to the new value', () => {
    const { result } = renderHook(() => useInputState({ onChange }))
    act(() => {
      result.current.onChange(newValue)
    })
    expect(onChange).toHaveBeenCalledWith(newValue)
    expect(result.current.value).toBe(newValue)
  })

  it('the value is disabled if the "disabled" option is true: value is undefined and props.onChange is not called on input change', () => {
    const { result } = renderHook(() => useInputState({ onChange, disabled: true }))
    expect(result.current.value).toBe(undefined)
    expect(result.current.enableInteractions).toBe(false)
    expect(result.current.isControlled).toBe(false)
    act(() => {
      result.current.onChange(newValue)
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('the prop value cannot be defined afterwards', () => {
    const { result, rerender } = renderHook(() => useInputState({ onChange }))
    act(() => {
      rerender({ value, onChange })
    })
    expect(onChange).not.toHaveBeenCalled()
    expect(result.current.value).toBe(undefined)
  })
})
