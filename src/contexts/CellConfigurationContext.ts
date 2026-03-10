import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'
import { createContext } from 'react'

import type { CellContentProps, StringifyFunction } from '../types.js'
import { stringify } from '../utils/stringify.js'

/** function to stringify the cell value, used for default rendering and for copy to clipboard */
export const StringifyContext = createContext<StringifyFunction>(stringify)

/** custom cell content component, if not provided, the default stringified value will be used */
export const RenderCellContentContext = createContext<((props: CellContentProps) => ReactNode) | undefined>(undefined)

/** callbacks for cell interactions (click, double click and key down), used for accessibility and custom interactions */
export const CellCallbacksContext = createContext<{
  /** double click callback */
  onDoubleClickCell?: (event: MouseEvent, col: number, row: number) => void
  /** mouse down callback */
  onMouseDownCell?: (event: MouseEvent, col: number, row: number) => void
  /** key down callback, for accessibility, it should be passed if onDoubleClickCell is passed. It can handle more than that action though. */
  onKeyDownCell?: (event: KeyboardEvent, col: number, row: number) => void
}>({})
