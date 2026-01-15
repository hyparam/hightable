import type { ReactNode } from 'react'
import { useMemo } from 'react'

import { defaultPadding, maxElementHeight, rowHeight } from '../helpers/constants.js'
import { ScrollModeNativeProvider } from './ScrollModeNativeProvider.js'
import { ScrollModeVirtualProvider } from './ScrollModeVirtualProvider.js'

export interface ScrollModeProviderProps {
  padding?: number // number of rows to render beyond the visible table cells
}

type Props = {
  children: ReactNode
  headerHeight: number // height of the table header
  numRows: number
} & ScrollModeProviderProps

export function ScrollModeProvider({ children, headerHeight, numRows, padding = defaultPadding }: Props) {
  // total table height - it's fixed, based on the number of rows.
  // if the number of rows is big, this value can overflow the maximum height supported by the browser.
  // If so, we switch to the 'virtual scroll' mode, where we override the scrolling mechanism.
  const tableHeight = useMemo(() => headerHeight + numRows * rowHeight, [numRows, headerHeight])

  if (tableHeight < maxElementHeight) {
    return (
      <ScrollModeNativeProvider canvasHeight={tableHeight} numRows={numRows} headerHeight={headerHeight} padding={padding}>
        {children}
      </ScrollModeNativeProvider>
    )
  } else {
    return (
      <ScrollModeVirtualProvider canvasHeight={maxElementHeight} numRows={numRows} headerHeight={headerHeight} padding={padding}>
        {children}
      </ScrollModeVirtualProvider>
    )
  }
}
