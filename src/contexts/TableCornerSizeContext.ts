import { createContext } from 'react'

import { rowHeight } from '../helpers/constants.js'

type SetTableCornerSizeContextType = (element: HTMLElement) => void

export const defaultTableCornerHeight = rowHeight
export const TableCornerHeightContext = createContext<number>(defaultTableCornerHeight)
export const TableCornerWidthContext = createContext<number | undefined>(undefined)
export const SetTableCornerSizeContext = createContext<SetTableCornerSizeContextType | undefined>(undefined)
