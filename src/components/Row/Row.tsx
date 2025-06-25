import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  selected?: boolean
  ariaRowIndex: number
  title?: string
}

export default function Row({
  children,
  ariaRowIndex,
  selected,
  title,
}: Props) {
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
