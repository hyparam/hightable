import type { RefObject } from 'react'
import { createContext } from 'react'

interface TableCornerContextType {
  tableCornerRef: RefObject<HTMLTableCellElement | null>
  tableCornerWidth?: number // width of the table corner in pixels
}

export const defaultTableCornerContext: TableCornerContextType = {
  tableCornerRef: { current: null },
}

export const TableCornerContext = createContext<TableCornerContextType>(defaultTableCornerContext)
