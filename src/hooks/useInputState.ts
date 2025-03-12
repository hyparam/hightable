import { useCallback, useState } from 'react'

/**
 * Props for the useInputState hook.
 * @param value the external value. If undefined, the input is uncontrolled and has a local state. This value cannot be unset (undefined) later if controlled, or set to a value if uncontrolled.
 * @param onChange the callback to call when the input changes. If undefined, the input is read-only.
 * @param defaultValue the default value for the local state if the input is uncontrolled.
 * @param disabled true if the input is disabled. In this case, the value is undefined and the result onChange function does nothing.
 */
interface UseInputStateProps<T> {
  value?: T,
  onChange?: ((value: T) => void),
  defaultValue?: T
  disabled?: boolean
}

/**
 * Result of the useInputState hook.
 *
 * @param value the current input value
 * @param onChange the callback to call when the input changes
 * @param enableInteractions true if the input can be changed by the user
 * @param isControlled true if the input value is controlled by the parent
 */
interface UseInputStateResult<T> {
  value: T | undefined
  onChange: (value: T) => void
  enableInteractions: boolean
  isControlled: boolean
}

/**
 * Simulates the state of React <input> components. See https://react.dev/reference/react-dom/components/input#controlling-an-input-with-a-state-variable
 *
 * The input state can be:
 * - controlled (if value is defined): the parent controls the value. No local state.
 * - uncontrolled (if value is undefined): the input controls the value. Local state.
 * - disabled: the value is hidden and the user interactions are disabled. No local state.
 *
 * Note that the onChange prop can be defined or undefined. If undefined in a controlled state, the input is read-only (no interactions),
 * else, the input can change but the parent cannot get the value.
 */
export function useInputState<T>( props: UseInputStateProps<T>): UseInputStateResult<T> {
  const { value: propValue, onChange: propOnChange, defaultValue, disabled } = props
  const [initialValue] = useState<T | undefined>(propValue)
  const [initialDisabled] = useState<boolean>(disabled ?? false)
  const [localValue, setLocalValue] = useState<T | undefined>(defaultValue)
  const isControlled = initialValue !== undefined
  let enableInteractions = true
  let value: T | undefined
  if (initialDisabled) {
    value = undefined
    enableInteractions = false
  } else if (isControlled) {
    if (propValue === undefined) {
      console.warn('The value is controlled (it has no local state) because the property was initially defined. It cannot be set to undefined now (it is set back to the initial value).')
      value = initialValue
    } else {
      value = propValue
    }
    // read-only if propOnChange is undefined
    enableInteractions = propOnChange !== undefined
  } else {
    if (propValue !== undefined) {
      console.warn('The value is uncontrolled (it only has a local state) because the property was initially undefined. It cannot be set to a value now and is ignored.')
    }
    value = localValue
    enableInteractions = true
  }
  const onChange = useCallback((selection: T) => {
    if (!enableInteractions) {
      return
    }
    propOnChange?.(selection)
    if (!isControlled) {
      setLocalValue(selection)
    }
  }, [propOnChange, isControlled, enableInteractions])
  return { value, onChange, enableInteractions, isControlled }
}
