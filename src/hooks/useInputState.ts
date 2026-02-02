import { useCallback, useContext, useState } from 'react'

import { ErrorContext } from '../contexts/ErrorContext.js'

/**
 * Props for the useInputState hook.
 * @param value the external value. If undefined, the input is uncontrolled and has a local state. This value cannot be unset (undefined) later if controlled, or set to a value if uncontrolled.
 * @param onChange the callback to call when the input changes. If undefined, the input is read-only.
 * @param defaultValue the default value for the local state if the input is uncontrolled.
 */
interface UseInputStateProps<T> {
  value?: T
  onChange?: ((value: T) => void)
  defaultValue: T
}

/**
 * Result of the useInputState hook.
 *
 * @param value the current input value
 * @param onChange the callback to call when the input changes. undefined if the input cannot be changed by the user.
 */
interface UseInputStateResult<T> {
  value: T
  onChange?: ((value: T) => void)
}

/**
 * Simulates the state of React <input> components. See https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
 *
 * Depending on the initial props, the input state will be set, and remain, in one of these modes:
 * - controlled (if initial value is defined): the parent controls the value. No local state.
 * - uncontrolled (if initial value is undefined): the input controls the value. Local state.
 *
 * If the initial value is defined, but not the onChange prop, the input is read-only (no interactions).
 */
export function useInputState<T>({ value, onChange, defaultValue }: UseInputStateProps<T>): UseInputStateResult<T> {
  const { onWarn } = useContext(ErrorContext)
  const [initialValue] = useState<T | undefined>(value)

  // for uncontrolled inputs
  // the local state and the uncontrolledOnChange callback are created unconditionally to
  // follow the Rules of Hooks, but are not used in controlled mode
  const [localValue, setLocalValue] = useState<T>(defaultValue)
  const uncontrolledOnChange = useCallback((selection: T) => {
    onChange?.(selection)
    setLocalValue(selection)
  }, [onChange])

  // The input is forever in one of these two modes:

  // - controlled (no local state)
  if (initialValue !== undefined) {
    if (value === undefined) {
      onWarn('The value is controlled (it has no local state) because the property was initially defined. It cannot be set to undefined now (it is set back to the initial value).')
    }
    return {
      value: value ?? initialValue,
      // read-only if onChange is undefined
      onChange,
    }
  }

  // - uncontrolled (local state)
  if (value !== undefined) {
    onWarn('The value is uncontrolled (it only has a local state) because the property was initially undefined. It cannot be set to a value now and is ignored.')
  }
  return { value: localValue, onChange: uncontrolledOnChange }
}

/**
 * Simulates the state of React <input> components. See https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
 *
 * Depending on the initial props, the input state will be set, and remain, in one of these modes:
 * - controlled (if initial value is defined): the parent controls the value. No local state.
 * - uncontrolled (if initial value is undefined): the input controls the value. Local state.
 * - disabled (if the initial value and onChange are undefined): the value is hidden and the user interactions are disabled. No local state.
 *
 * If the initial value is defined, but not the onChange prop, the input is read-only (no interactions).
 */
export function useInputOrDisabledState<T>({ value, onChange, defaultValue }: UseInputStateProps<T>): UseInputStateResult<T> | undefined {
  const [isDisabled] = useState<boolean>(() => value === undefined && onChange === undefined)
  const inputState = useInputState<T>({ value, onChange, defaultValue })
  return isDisabled ? undefined : inputState
}
