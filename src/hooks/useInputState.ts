import { useCallback, useMemo, useState } from 'react'

/**
 * Props for the useInputState hook.
 */
interface UseInputStateProps<T> {
  /**
   * The initial value, used only if the input is uncontrolled.
   */
  initialUncontrolledValue: T
  /**
   * The controlled value, used only if the input is controlled.
   *
   * An input is considered as controlled iff controlledValue is defined on the first call.
   *
   * Once the mode is set, it cannot be changed. Thus:
   * - if uncontrolled, this value will always be ignored.
   * - if controlled, this value is always expected to be defined, and if not, the first passed controlled value is returned.
   */
  controlledValue?: T
  /**
   * The optional callback to call when setting the state.
   *
   * - uncontrolled mode:
   *   - if defined, this callback is called on top of the local state setter, e.g. to notify the parent of the local change.
   *   - if undefined, the local state is still set.
   *
   * - controlled mode:
   *   - if defined, this callback is called to notify the parent of the requested change. Note that there is no guarantee
   *     that the parent will update the 'controlledValue' prop on next render.
   *   - if undefined, the input is read-only, and the returned onChange callback is undefined.
   *
   * Contrary to the 'controlledValue' prop, this callback can be toggled between defined and undefined at any time.
   */
  onChange?: ((value: T) => void)
  /**
   * The optional callback to call when the state value changed, either from the local state or from the controlled value.
   *
   * The difference with the onChange callback is that this callback is called whenever the value changes,
   * regardless of the mode (controlled or uncontrolled), and even if the change is not triggered by a user
   * interaction (e.g. when the controlled value changes from an external source).
   *
   * Also note that the value is not passed.
   */
  notifyChange?: () => void
}

/**
 * Result of the useInputState hook.
 *
 */
type UseInputStateResult<T> = [
  /** the current state value */
  T,
  /**
   * The state setter.
   *
   * Compared to the useState setter:
   * - it can be undefined, in which case the state cannot be set, i.e. the user interactions should be disabled;
   * - it can only be called with the new value directly, and not with a function updater.
   */
  ((value: T) => void) | undefined
]

/**
 * Simulates the state of React <input> components. See https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
 *
 * Depending on the initial props, the input state will be set, and remain, in one of these modes:
 * - controlled (if controlledValue is defined on first call): the parent controls the value. No local state.
 * - uncontrolled (if controlledValue is undefined on first call): the input controls the value. Local state.
 *
 * If the initial controlled value is defined, but not the onChange prop, the input is read-only (no interactions).
 */
export function useInputState<T>({ controlledValue, onChange, initialUncontrolledValue, notifyChange }: UseInputStateProps<T>): UseInputStateResult<T> {
  const [initialControlledValue] = useState<T | undefined>(controlledValue)
  const [localValue, setLocalValue] = useState<T>(() => controlledValue ?? initialUncontrolledValue)
  const setLocalValueAndNotify = useCallback((value: T) => {
    setLocalValue(value)
    notifyChange?.()
  }, [notifyChange])

  const uncontrolledOnChange = useCallback((value: T) => {
    onChange?.(value)
    setLocalValueAndNotify(value)
  }, [onChange, setLocalValueAndNotify])

  if (
    initialControlledValue !== undefined
    && controlledValue !== localValue
    && (
      controlledValue !== undefined
      // if controlledValue is undefined, set localValue to initialControlledValue, but only once
      || localValue !== initialControlledValue
    )
  ) {
    // if the input is controlled and the value has changed,
    // store the new value, and notify the change.
    setLocalValueAndNotify(controlledValue ?? initialControlledValue)
  }

  return useMemo(() => {
    // The input is forever in one of these two modes:
    // - controlled (no local state)
    if (initialControlledValue !== undefined) {
      if (controlledValue === undefined) {
        console.warn('The value is controlled (it has no local state) because the property was initially defined. It cannot be set to undefined now (it is set back to the initial value).')
      }
      return [
        controlledValue ?? initialControlledValue,
        // read-only if onChange is undefined
        onChange,
      ]
    }

    // - uncontrolled (local state)
    if (controlledValue !== undefined) {
      console.warn('The value is uncontrolled (it only has a local state) because the property was initially undefined. It cannot be set to a value now and is ignored.')
    }
    return [localValue, uncontrolledOnChange]
  }, [controlledValue, onChange, initialControlledValue, localValue, uncontrolledOnChange])
}
