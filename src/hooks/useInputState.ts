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
}

/**
 * Result of the useInputState hook.
 *
 */
type UseInputStateResult<T> = {
  /** the mode of the input state, either controlled (parent state) or uncontrolled (local state) */
  type: 'controlled'
  /** the current input value */
  value: T
  /** the callback to call when the input changes. If undefined, the user interactions (or optimistical updates) should be disabled. */
  onChange?: ((value: T) => void)
} | {
  /** the mode of the input state, either controlled (parent state) or uncontrolled (local state) */
  type: 'uncontrolled'
  /** the current input value */
  value: T
  /** the callback to call when the input changes. */
  onChange: ((value: T) => void)
}

/**
 * Simulates the state of React <input> components. See https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
 *
 * Depending on the initial props, the input state will be set, and remain, in one of these modes:
 * - controlled (if controlledValue is defined on first call): the parent controls the value. No local state.
 * - uncontrolled (if controlledValue is undefined on first call): the input controls the value. Local state.
 *
 * If the initial controlled value is defined, but not the onChange prop, the input is read-only (no interactions).
 */
export function useInputState<T>({ controlledValue, onChange, initialUncontrolledValue }: UseInputStateProps<T>): UseInputStateResult<T> {
  const [initialControlledValue] = useState<T | undefined>(controlledValue)

  // for uncontrolled inputs
  // the local state and the uncontrolledOnChange callback are created unconditionally to
  // follow the Rules of Hooks, but are not used in controlled mode
  const [localValue, setLocalValue] = useState<T>(initialUncontrolledValue)
  const uncontrolledOnChange = useCallback((value: T) => {
    onChange?.(value)
    setLocalValue(value)
  }, [onChange])

  return useMemo(() => {
    // The input is forever in one of these two modes:
    // - controlled (no local state)
    if (initialControlledValue !== undefined) {
      if (controlledValue === undefined) {
        console.warn('The value is controlled (it has no local state) because the property was initially defined. It cannot be set to undefined now (it is set back to the initial value).')
      }
      return {
        type: 'controlled',
        value: controlledValue ?? initialControlledValue,
        // read-only if onChange is undefined
        onChange,
      }
    }

    // - uncontrolled (local state)
    if (controlledValue !== undefined) {
      console.warn('The value is uncontrolled (it only has a local state) because the property was initially undefined. It cannot be set to a value now and is ignored.')
    }
    return {
      type: 'uncontrolled',
      value: localValue,
      onChange: uncontrolledOnChange,
    }
  }, [controlledValue, onChange, initialControlledValue, localValue, uncontrolledOnChange])
}
