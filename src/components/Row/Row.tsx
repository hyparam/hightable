import { ReactNode } from 'react'
import { useRow } from '../../hooks/useUnsortedRow'

interface Props {
  children: ReactNode
  isRowSelected?: (unsortedRow: number | undefined) => boolean | undefined
  ariaRowIndex: number
  title?: string
}

export default function Row({
  children,
  ariaRowIndex,
  title,
}: Props) {
  const { selected } = useRow()
  return (
    <tr
      role="row"
      aria-rowindex={ariaRowIndex}
      title={title}
      aria-selected={selected}
    >
      {children}
    </tr>
  )
}
