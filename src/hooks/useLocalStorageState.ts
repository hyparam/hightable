import { Dispatch, SetStateAction, useCallback, useState } from 'react'

/**
 * Get value from local storage for a key.
 */
function loadFromLocalStorage(key: string): unknown {
  const json = localStorage.getItem(key)
  return json ? JSON.parse(json) : undefined
}

/**
 * Set value in local storage for a key.
 *
 * If value is undefined, the column value is removed from local storage.
 */
function saveToOrDeleteFromLocalStorage({ key, value }: { key?: string, value: unknown }) {
  if (key === undefined) {
    return
  }
  if (value === undefined) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

/**
 * Hook to use a state that is persisted in local storage.
 *
 * The initial value is loaded from local storage if the key is defined.
 * If the key is undefined, the local storage is not used, and the initial value is undefined.
 *
 * If the key changes, the value is updated from local storage. If the new key is undefined, the value does not change.
 *
 * Note that the values stored with a previous key are maintained.
 * TODO(SL): add a way to delete them?
 *
 * Contrarily to useState, the initial value is always undefined.
 *
 * @param options
 * @param [string | undefined] options.key The key to use in local storage. If undefined, the value is not persisted.
 *
 * @returns [T | undefined, Dispatch<SetStateAction<T | undefined>>] The value and the setter.
 */
export function useLocalStorageState<T>({ key }: { key?: string } = {}): [T | undefined, Dispatch<SetStateAction<T | undefined>>] {
  const [value, setValue] = useState<T | undefined>(undefined)
  const [lastCacheKey, setLastCacheKey] = useState<string | undefined>(undefined)
  if (key !== lastCacheKey) {
    if (key !== undefined) {
      // TODO(SL): check if the type of loaded value is T | undefined, accepting a check function as an argument?
      setValue(loadFromLocalStorage(key) as T | undefined)
    } // else: do not change the value
    setLastCacheKey(key)
  }

  const memoizedSetValue = useCallback((valueOrSetter: SetStateAction<T | undefined>) => {
    if (typeof valueOrSetter === 'function') {
      // Typescript does not provide a way to prevent T from being a function,
      // so we have to assume that the function is a setter, and cast it.
      const setter = valueOrSetter as (prevState: T | undefined) => T | undefined
      if (key === undefined) {
        setValue(setter)
      } else {
        const currentValue = loadFromLocalStorage(key) as T | undefined
        const nextValue = setter(currentValue)
        setValue(nextValue)
        saveToOrDeleteFromLocalStorage({ key, value: nextValue })
      }
    } else {
      const nextValue = valueOrSetter
      setValue(nextValue)
      saveToOrDeleteFromLocalStorage({ key, value: nextValue })
    }
  }, [key])

  return [value, memoizedSetValue]
}
