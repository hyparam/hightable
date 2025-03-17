import { ReactNode } from 'react'

interface Props {
  children: ReactNode
  selected?: boolean
  ariaRowIndex: number
  title?: string
}

export default function Row({
  children,
  selected,
  ariaRowIndex,
  title,
}: Props) {
  return (
    <tr
      role="row"
      aria-rowindex={ariaRowIndex}
      title={title}
      className={selected ? 'selected' : undefined} // TODO: use [aria-selected] instead in CSS
      aria-selected={selected}
    >
      {children}
    </tr>
  )
}
