import React from 'react'

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
function saveToOrDeleteFromLocalStorage(key: string, value: unknown) {
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
 * If the key is undefined, the local storage is not used, and the initial value is initialValue.
 *
 * If the key changes, the value is updated from local storage. If the new key is undefined, the value does not change.
 *
 * Note that the values stored with a previous key are maintained.
 * TODO(SL): add a way to delete them?
 *
 * @param [string | undefined] key The key to use in local storage. If undefined, the value is not persisted.
 * @param [T | undefined] initialValue The initial value if the key is undefined.
 * TODO(SL): allow passing a function to initialize the value?
 *
 * @returns [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>] The value and the setter.
 */
export function useLocalStorageState<T>({ key, initialValue }: {key?: string, initialValue?: T}): [T | undefined, React.Dispatch<React.SetStateAction<T | undefined>>] {
  const [value, setValue] = React.useState<T | undefined>(() => {
    // TODO(SL): check the loaded value?
    return key !== undefined ? loadFromLocalStorage(key) as T | undefined : initialValue
  })
  const [lastCacheKey, setLastCacheKey] = React.useState<string | undefined>(key)
  if (key !== lastCacheKey) {
    if (key !== undefined) {
      // TODO(SL): check the loaded value?
      setValue(loadFromLocalStorage(key) as T | undefined)
    } // else: do not change the value
    setLastCacheKey(key)
  }
  const memoizedSetValue = React.useCallback((value: React.SetStateAction<T | undefined>) => {
    setValue(value)
    if (key !== undefined) {
      saveToOrDeleteFromLocalStorage(key, value)
    }
  }, [key])

  return [value, memoizedSetValue]
}
