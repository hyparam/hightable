import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  selected?: boolean
  ariaRowIndex: number
  rowNumber?: number
  title?: string
}

export default function Row({
  children,
  ariaRowIndex,
  selected,
  rowNumber,
  title,
}: Props) {
  return (
    <tr
      role="row"
      aria-rowindex={ariaRowIndex}
      title={title}
      aria-selected={selected}
      data-rownumber={rowNumber}
    >
      {children}
    </tr>
  )
}
