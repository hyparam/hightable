import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useLocalStorageState } from '../../src/hooks/useLocalStorageState.js'

vi.stubGlobal('localStorage', (() => {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => { store.delete(key) },
    setItem: (key: string, value: string) => { store.set(key, value) },
    clear: () => { store.clear() },
    get length() { return store.size },
  }
})())

// delete the local storage before each test
beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorageState hook', () => {
  it('should use initialize to undefined, if no argument is provided', () => {
    const { result } = renderHook(() => useLocalStorageState())
    const [ value ] = result.current
    expect(value).toEqual(undefined)
  })

  it('should use initialize to undefined, if no key and no initial value is provided', () => {
    const { result } = renderHook(() => useLocalStorageState({ }))
    const [ value ] = result.current
    expect(value).toEqual(undefined)
  })

  it('should return empty value for a non-existing key', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'key' }))
    const [ value ] = result.current
    expect(value).toEqual(undefined)
  })

  it('should return an existing value from the local storage', () => {
    localStorage.setItem('key', '42')
    const { result } = renderHook(() => useLocalStorageState({ key: 'key' }))
    const [ value ] = result.current
    expect(value).toEqual(42)
  })

  it('should store the value in local storage', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'key' }))
    const [ , setValue ] = result.current

    act(() => {
      setValue(42)
    })
    const [ value ] = result.current
    expect(value).toEqual(42)
    expect(localStorage.getItem('key')).toEqual('42')
    expect(localStorage.length).toEqual(1)
  })

  it('should delete the value from local storage if passed undefined', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'key' }))
    const [ , setValue ] = result.current

    act(() => {
      setValue(42)
    })
    expect(localStorage.getItem('key')).toEqual('42')
    const [ value2, setValue2 ] = result.current
    expect(value2).toEqual(42)

    act(() => {
      setValue2(undefined)
    })
    expect(localStorage.getItem('key')).toEqual(null)
    const [ value3 ] = result.current
    expect(value3).toEqual(undefined)
  })

  it('should maintain the previous key in localstorage if the key changes', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'previous_key' }))
    const [ , setValue ] = result.current

    act(() => {
      setValue(1)
    })
    expect(localStorage.getItem('previous_key')).toEqual('1')
    const { result: result2 } = renderHook(() => useLocalStorageState({ key: 'new_key' }))
    const [ , setValue2 ] = result2.current

    act(() => {
      setValue2(2)
    })
    expect(localStorage.getItem('new_key')).toEqual('2')
    expect(localStorage.getItem('previous_key')).toEqual('1')
    expect(localStorage.length).toEqual(2)
  })

  it('should work as a normal state if no key is passed', () => {
    const { result } = renderHook(() => useLocalStorageState())
    const [ , setValue ] = result.current

    act(() => {
      setValue(42)
    })
    const [ value ] = result.current
    expect(value).toEqual(42)
  })

  it('should not use the local storage if no key is passed', () => {
    const { result } = renderHook(() => useLocalStorageState())
    const [ , setValue ] = result.current

    act(() => {
      setValue(42)
    })
    expect(localStorage.length).toEqual(0)
  })
})
