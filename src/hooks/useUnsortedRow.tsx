import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { DataFrame, DataFrameEvents, isSortableDataFrame } from '../helpers/dataframe/index.js'
import { OrderBy, areEqualOrderBy } from '../helpers/sort.js'

interface RowContextType {
  unsortedRow?: number
  selected?: boolean
}

export const RowContext = createContext<RowContextType>({})

interface RowProviderProps {
  row: number // index of the table in the page, used to identify the context
  data: DataFrame
  orderBy?: OrderBy
  isRowSelected?: (unsortedRow: number | undefined) => boolean | undefined
  children: ReactNode
}

function getUnsortedRow({ data, row, orderBy }: { data: DataFrame; row: number; orderBy?: OrderBy }): number | undefined {
  if (!isSortableDataFrame(data)) {
    return row
  }
  return data.getUnsortedRow({ row, orderBy })?.value
}

export function RowProvider({ children, data, row, orderBy, isRowSelected }: RowProviderProps) {
  const [unsortedRow, setUnsortedRow] = useState<number | undefined>(() => {
    return getUnsortedRow({ data, row, orderBy })
  })

  useEffect(() => {
    // update unsortedRow when data or orderBy changes
    setUnsortedRow(getUnsortedRow({ data, row, orderBy }))
    // and listen for updates to the dataframe if the data is sortable (the index might still be undefined)
    if (isSortableDataFrame(data)) {
      function callback(event: CustomEvent<DataFrameEvents['dataframe:index:update']>) {
        const { rowStart, rowEnd, orderBy: eventOrderBy } = event.detail
        // ensure it's a sortable dataframe
        if (rowStart <= row && row < rowEnd && areEqualOrderBy(eventOrderBy, orderBy)) {
          setUnsortedRow(getUnsortedRow({ data, row, orderBy }))
        }
      }
      data.eventTarget.addEventListener('dataframe:index:update', callback)
      return () => {
        data.eventTarget.removeEventListener('dataframe:index:update', callback)
      }
    }
  }, [data, row, orderBy])

  return (
    <RowContext.Provider value={{
      unsortedRow,
      selected: isRowSelected?.(unsortedRow),
    }}>
      {children}
    </RowContext.Provider>
  )
}

export function useRow() {
  return useContext(RowContext)
}
