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
    const [value] = useLocalStorageState({ key: 'nonExistingKey' })
    expect(value).toEqual(undefined)
  })

  it('should return the initial value, if provided, for a non-existing key', () => {
    const [value] = useLocalStorageState({ key: 'nonExistingKey', initialValue: 42 })
    expect(value).toEqual(42)
  })
})
