import React from 'react'

interface Props {
  children: React.ReactNode
  selected?: boolean
  ariaRowIndex: number
  title?: string
}

function Row({
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

export default Row
