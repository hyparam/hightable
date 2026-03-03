import { type ReactNode, useCallback, useState } from 'react'

import { SetViewportSizeContext, ViewportHeightContext, ViewportWidthContext } from '../contexts/ViewportSizeContext.js'

interface Props {
  /** Child components */
  children: ReactNode
}

/**
 * Handles the viewport width state.
 *
 * Provides the current viewport width and a callback to update it.
 */
export function ViewportSizeProvider({ children }: Props) {
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(undefined)
  const setViewportSize = useCallback((element: HTMLElement) => {
    setViewportWidth(element.clientWidth)

    // TODO(SL): remove this fallback? It's only for the tests in Node.js, where the elements have zero height
    // TODO(SL): instead of jsdom, test in the browser (playwright) where elements have a height
    setViewportHeight(element.clientHeight === 0 ? 100 : element.clientHeight)
  }, [])

  // Multiple contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <SetViewportSizeContext.Provider value={setViewportSize}>
      <ViewportHeightContext.Provider value={viewportHeight}>
        <ViewportWidthContext.Provider value={viewportWidth}>
          {children}
        </ViewportWidthContext.Provider>
      </ViewportHeightContext.Provider>
    </SetViewportSizeContext.Provider>
  )
}
