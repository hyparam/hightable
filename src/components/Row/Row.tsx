import { ReactNode } from 'react'
import classes from './Row.module.css'

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
      className={selected ? classes.selected : undefined} // TODO: use [aria-selected] instead in CSS
      aria-selected={selected}
    >
      {children}
    </tr>
  )
}
