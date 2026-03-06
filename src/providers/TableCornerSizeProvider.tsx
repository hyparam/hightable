import { type ReactNode, useCallback, useState } from 'react'

import { defaultTableCornerHeight, SetTableCornerSizeContext, TableCornerHeightContext, TableCornerWidthContext } from '../contexts/TableCornerSizeContext.js'

interface Props {
  /** Child components */
  children: ReactNode
}

/**
 * Handles the table corner size (width and height) state.
 *
 * Provides the current table corner width and height via context, and a callback to update them.
 */
export function TableCornerSizeProvider({ children }: Props) {
  const [tableCornerWidth, setTableCornerWidth] = useState<number | undefined>(undefined)
  const [tableCornerHeight, setTableCornerHeight] = useState<number>(defaultTableCornerHeight)
  const setTableCornerSize = useCallback((element: HTMLElement) => {
    // we use offsetWidth and offsetHeight as they include padding, borders, and scrollbars (when present)
    setTableCornerWidth(element.offsetWidth)
    setTableCornerHeight(element.offsetHeight)
  }, [])

  // Multiple contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <SetTableCornerSizeContext.Provider value={setTableCornerSize}>
      <TableCornerHeightContext.Provider value={tableCornerHeight}>
        <TableCornerWidthContext.Provider value={tableCornerWidth}>
          {children}
        </TableCornerWidthContext.Provider>
      </TableCornerHeightContext.Provider>
    </SetTableCornerSizeContext.Provider>
  )
}
