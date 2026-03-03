import { type ReactNode, useMemo, useState } from 'react'

import { ViewportApiContext, ViewportDataContext } from '../contexts/ViewportContext.js'

interface Props {
  /** Child components */
  children: ReactNode
}

/**
 * Handles the viewport width state.
 *
 * Provides the current viewport width and a callback to update it.
 */
export function ViewportProvider({ children }: Props) {
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(undefined)
  const data = useMemo(() => ({ viewportWidth }), [viewportWidth])
  const api = useMemo(() => ({ setViewportWidth }), [setViewportWidth])

  // Two contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <ViewportDataContext.Provider value={data}>
      <ViewportApiContext.Provider value={api}>
        {children}
      </ViewportApiContext.Provider>
    </ViewportDataContext.Provider>
  )
}
