import React from 'react'

interface Props {
  children: React.ReactNode
  selected?: boolean
  tableIndex: number
  title?: string
}

function Row({
  children,
  selected,
  tableIndex,
  title,
}: Props) {
  const ariaRowIndex = tableIndex + 2 // 1-based + the header row (TODO(SL): maybe pass it in as a prop, since the row component has no reason to know about the table)
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
