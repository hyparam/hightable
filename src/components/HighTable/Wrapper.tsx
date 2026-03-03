import type { CSSProperties, ReactNode } from 'react'

import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import { useHeaderHeight } from '../../contexts/TableCornerSizeContext.js'
import styles from '../../HighTable.module.css'
import { useHTMLElement } from '../../hooks/useHTMLElement.js'
import type { HighTableProps } from '../../types.js'

type Props = Pick<HighTableProps, 'className' | 'maxRowNumber' | 'styled'> & {
  /** Number of rows in the data frame */
  numRows: number
  /** Child components */
  children: ReactNode
}

export default function Wrapper({ children, className, maxRowNumber, styled, numRows }: Props) {
  const headerHeight = useHeaderHeight()

  // reserve space for at least 3 characters
  const numCharacters = Math.max((maxRowNumber ?? numRows).toLocaleString('en-US').length, 3)

  // Get a reference to the container element
  const { element, onMount } = useHTMLElement<HTMLDivElement>()

  return (
    <div
      ref={onMount}
      className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`}
      style={{
        '--column-header-height': `${headerHeight}px`,
        '--row-number-characters': `${numCharacters}`,
      } as CSSProperties}
    >
      <PortalContainerContext.Provider value={element}>
        {children}
      </PortalContainerContext.Provider>
    </div>
  )
}
