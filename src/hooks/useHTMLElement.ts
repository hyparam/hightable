import { useCallback, useState } from 'react'

/**
 * A hook to get a reference to an HTML element on component mount.
 *
 * @example
 * const { element, onMount } = useHTMLElement<HTMLDivElement>()
 *
 * return <div ref={onMount}></div>
 *
 * @returns An object containing the HTML element and a ref callback to be assigned to the element.
 */
export function useHTMLElement<T extends HTMLElement>() {
  const [element, setElement] = useState<T | null>(null)
  const onMount = useCallback((node: T | null) => {
    setElement(node)
    return () => {
      setElement(null)
    }
  }, [])

  return {
    element,
    onMount,
  }
}
