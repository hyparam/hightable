import type { Dispatch, SetStateAction } from 'react'
import { useEffect, useState } from 'react'

type Parse<T> = (value: string) => T
type Stringify<T> = (value: T) => string

/**
 * Get value from local storage for a key.
 */
function loadFromLocalStorage<T>({ key, parse }: { key: string, parse?: Parse<T> }): T | undefined {
  const json = localStorage.getItem(key)
  return json ? (parse ?? JSON.parse)(json) : undefined
}

/**
 * Set value in local storage for a key.
 *
 * If value is undefined, the column value is removed from local storage.
 */
function saveToOrDeleteFromLocalStorage<T>({ key, value, stringify }: { key?: string, value: unknown, stringify?: Stringify<T> }) {
  if (key === undefined) {
    return
  }
  if (value === undefined) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, (stringify ?? JSON.stringify)(value))
  }
}

interface Options<T> {
  key?: string // The key to use in local storage. If undefined, the value is not persisted.
  parse?: Parse<T> // A function to parse the value from local storage. If not provided, JSON.parse is used.
  stringify?: Stringify<T> // A function to stringify the value to local storage. If not provided, JSON.stringify is used.
}

/**
 * Hook to use a state that is persisted in local storage.
 *
 * If the key is not defined, it's a normal useState hook. The only difference is that the initial value is always undefined.
 *
 * If the key is defined, the initial value is loaded from local storage, and the value is persisted in local storage after each change.
 *
 * If the key changes, the value is updated from local storage. If the new key is undefined, the value does not change.
 * Note that the values stored with a previous key are maintained.
 * TODO(SL): add a way to delete them?
 *
 * @param options
 * @param [string | undefined] options.key The key to use in local storage. If undefined, the value is not persisted.
 * @param [function] options.parse A function to parse the value from local storage. If not provided, JSON.parse is used.
 * @param [function] options.stringify A function to stringify the value to local storage. If not provided, JSON.stringify is used.
 *
 * @returns [T | undefined, Dispatch<SetStateAction<T | undefined>>] The value and the setter.
 */
export function useLocalStorageState<T>({ key, parse, stringify }: Options<T> = {}): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [lastCacheKey, setLastCacheKey] = useState<string | undefined>(undefined)
  if (key !== lastCacheKey) {
    if (key !== undefined) {
      setValue(loadFromLocalStorage({ key, parse }))
    } // else: do not change the value
    setLastCacheKey(key)
  }

  useEffect(() => {
    saveToOrDeleteFromLocalStorage({ key, value, stringify })
  }, [value, key, stringify])

  return [value, setValue]
}
