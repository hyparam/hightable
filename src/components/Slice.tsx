import { useContext, useMemo } from 'react'

import { SliceTopContext } from '../contexts/ScrollContext.js'

interface Props {
  /** Child components */
  children?: React.ReactNode
}

export default function Slice({ children }: Props) {
  const sliceTop = useContext(SliceTopContext)

  const sliceTopStyle = useMemo(() => {
    return sliceTop !== undefined ? { top: `${sliceTop}px` } : {}
  }, [sliceTop])

  return (
    <div style={sliceTopStyle}>
      {children}
    </div>
  )
}
