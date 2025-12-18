import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { TableCornerContext } from '../contexts/TableCornerContext.js'

// TODO(SL): replace with https://usehooks-ts.com/react-hook/use-resize-observer#hook (dependency to usehooks-ts)?

interface TableCornerProviderProps {
  children: ReactNode
}

export function TableCornerProvider({ children }: TableCornerProviderProps) {
  const tableCornerRef = useRef<HTMLTableCellElement>(null)
  const [tableCornerWidth, setTableCornerWidth] = useState<number | undefined>(undefined)

  useEffect(() => {
    const tableCorner = tableCornerRef.current
    if (!tableCorner) {
      console.warn('Table corner element is not available. Table corner size will not be tracked accurately.')
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!window.ResizeObserver) {
      // for jsdom
      return
    }

    // Use an arrow function to get correct viewport type (not null)
    // eslint-disable-next-line func-style
    const updateTableCornerWidth = () => {
      setTableCornerWidth(tableCorner.offsetWidth)
    }

    // run once
    updateTableCornerWidth()

    // listener
    const resizeObserver = new window.ResizeObserver(([entry]) => {
      if (!entry) {
        console.warn('ResizeObserver entry is not available.')
        return
      }
      updateTableCornerWidth()
    })
    resizeObserver.observe(tableCorner)
    return () => {
      resizeObserver.unobserve(tableCorner)
      resizeObserver.disconnect()
    }
  }, [])

  return (
    <TableCornerContext.Provider value={{ tableCornerRef, tableCornerWidth }}>
      {children}
    </TableCornerContext.Provider>
  )
}
