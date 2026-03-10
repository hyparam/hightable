import { type ReactNode, useMemo } from 'react'

import { CellCallbacksContext, RenderCellContentContext, StringifyContext } from '../contexts/CellConfigurationContext.js'
import type { HighTableProps } from '../types.js'
import { stringify as defaultStringify } from '../utils/stringify.js'

type Props = Pick<HighTableProps, 'onDoubleClickCell' | 'onKeyDownCell' | 'onMouseDownCell' | 'renderCellContent' | 'stringify'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Provide cell configuration contexts.
 */
export function CellConfigurationProvider({ children, onDoubleClickCell, onKeyDownCell, onMouseDownCell, renderCellContent, stringify }: Props) {
  const cellCallbacks = useMemo(() => ({
    onDoubleClickCell,
    onKeyDownCell,
    onMouseDownCell,
  }), [onDoubleClickCell, onKeyDownCell, onMouseDownCell])

  // Multiple contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <CellCallbacksContext.Provider value={cellCallbacks}>
      <RenderCellContentContext.Provider value={renderCellContent}>
        <StringifyContext.Provider value={stringify ?? defaultStringify}>
          {children}
        </StringifyContext.Provider>
      </RenderCellContentContext.Provider>
    </CellCallbacksContext.Provider>
  )
}
