import type { CSSProperties } from 'react'
import { useContext, useMemo, useRef } from 'react'

import { DataContext } from '../../contexts/DataContext.js'
import { PortalContainerContext } from '../../contexts/PortalContainerContext.js'
import styles from '../../HighTable.module.css'
import { rowHeight } from './constants.js'
import type { HighTableViewportProps } from './HighTableViewport.js'
import HighTableViewport from './HighTableViewport.js'

export type HighTableWrapperProps = {
  className?: string // additional class names for the component
  styled?: boolean // use styled component? (default true)
} & HighTableViewportProps

export default function HighTableWrapper({ className = '', styled = true, ...rest }: HighTableWrapperProps) {
  const ref = useRef<HTMLDivElement>(null)

  const { maxRowNumber } = useContext(DataContext)

  const tableScrollStyle = useMemo(() => {
    // reserve space for at least 3 characters
    const numCharacters = Math.max(maxRowNumber.toLocaleString('en-US').length, 3)
    return {
      '--column-header-height': `${rowHeight}px`,
      '--row-number-characters': `${numCharacters}`,
    } as CSSProperties
  }, [maxRowNumber])

  return (
    <div ref={ref} className={`${styles.hightable} ${styled ? styles.styled : ''} ${className}`} style={tableScrollStyle}>
      <div className={styles.topBorder} role="presentation" />
      {/* TODO(SL): passing a ref to an element is code smell */}
      <PortalContainerContext.Provider value={{ containerRef: ref }}>
        <HighTableViewport {...rest} />
      </PortalContainerContext.Provider>
      {/* puts a background behind the row labels column */}
      <div className={styles.mockRowLabel}>&nbsp;</div>
    </div>
  )
}
