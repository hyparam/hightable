import { createContext, useContext } from 'react'

import { rowHeight } from '../helpers/constants.js'

type SetTableCornerSizeContextType = (element: HTMLElement) => void

export const TableCornerHeightContext = createContext<number | undefined>(undefined)
export const TableCornerWidthContext = createContext<number | undefined>(undefined)
export const SetTableCornerSizeContext = createContext<SetTableCornerSizeContextType | undefined>(undefined)

export function useTableCornerWidth() {
  return useContext(TableCornerWidthContext)
}

export function useHeaderHeight() {
  return useContext(TableCornerHeightContext) ?? rowHeight
}

export function useSetTableCornerSize() {
  return useContext(SetTableCornerSizeContext)
}
