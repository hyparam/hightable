import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useLocalStorageState } from '../../src/hooks/useLocalStorageState.js'

vi.stubGlobal('localStorage', (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    clear: () => { store = {} },
  }
})())

describe('useLocalStorageState hook', () => {
  it('should return empty value for a non-existing key', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'nonExistingKey' }))
    const [value] = result.current
    expect(value).toEqual(undefined)
  })

  it('should return the initial value, if provided, for a non-existing key', () => {
    const { result } = renderHook(() => useLocalStorageState({ key: 'nonExistingKey', initialValue: 42 }))
    const [value] = result.current
    expect(value).toEqual(42)
  })
})
