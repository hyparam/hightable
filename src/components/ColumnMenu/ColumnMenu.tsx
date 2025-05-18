import { createPortal } from 'react-dom'

interface ColumnMenuProps {
  columnName: string
  isVisible: boolean
  position: {
    left: number
    top: number
  }
}

export default function ColumnMenu({ columnName, isVisible, position }: ColumnMenuProps) {
  if (!isVisible) {
    console.log('not visible')
    return null
  }

  const { top, left } = position

  return createPortal(
    <div role='menu' style={{ top, left }}>
      <div role='presentation'>{columnName}</div>
      <h1>Column Menu</h1>
    </div>,
    document.body
  )
}
