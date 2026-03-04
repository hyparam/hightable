import { type ReactNode, useEffect, useState } from 'react'

import { ColumnDescriptorsContext, DataKeyContext, DataVersionContext, ExclusiveSortContext, NumColumnsContext, NumRowsContext } from '../contexts/DataContext.js'
import type { HighTableProps } from '../types.js'

// Assign stable numeric ids to data instances without triggering state
// updates during render, using a WeakMap keyed by the data object.
const dataInstanceKeys = new WeakMap<object, number>()
let nextDataInstanceKey = 0
function getDataKey(data: HighTableProps['data']): number {
  let k = dataInstanceKeys.get(data)
  if (k === undefined) {
    k = nextDataInstanceKey++
    dataInstanceKeys.set(data, k)
  }
  return k
}

type Props = Pick<HighTableProps, 'data'> & {
  /** Child components */
  children: ReactNode
}

/**
 * Provides the number of rows and columns, and the version of the data frame.
 *
 * It also providers a data key for testing purposes.
 */
export function DataProvider({ children, data }: Props) {
  const key = getDataKey(data)

  return (
    <DataKeyContext.Provider value={key}>
      <KeyedDataProvider data={data} key={key}>
        {children}
      </KeyedDataProvider>
    </DataKeyContext.Provider>
  )
}

// The data provider is keyed by the data instance, so that it resets its internal state
// when a new data frame is provided.
function KeyedDataProvider({ children, data }: Props) {
  // Two data frame elements can change over time:
  // - version (if any cell or row number has resolved or changed)
  // - numRows.
  // We update them through effects below.
  // Note: we expect the rest of the data frame (columnDescriptors, exclusiveSort, fetch, etc)
  // to be immutable but we don't enforce it here, and we cannot react to their changes.
  const [version, setVersion] = useState(0)
  const [numRows, setNumRows] = useState(data.numRows)

  // Some dataframe properties are expected to be stable for a given data frame.
  // We keep their initial value, no setter.
  const [columnDescriptors] = useState(() => data.columnDescriptors.map(({ name, sortable }) => ({ name, sortable })))
  const numColumns = columnDescriptors.length
  const [exclusiveSort] = useState(() => data.exclusiveSort === true)

  // Synchronize version and numRows with data frame events (external system - useEffect is needed)
  useEffect(() => {
    function onResolve() {
      setVersion(prev => prev + 1)
    }
    function onNumRowsChange() {
      setNumRows(data.numRows)
    }
    data.eventTarget?.addEventListener('numrowschange', onNumRowsChange)
    data.eventTarget?.addEventListener('resolve', onResolve)
    data.eventTarget?.addEventListener('update', onResolve)
    return () => {
      data.eventTarget?.removeEventListener('numrowschange', onNumRowsChange)
      data.eventTarget?.removeEventListener('resolve', onResolve)
      data.eventTarget?.removeEventListener('update', onResolve)
    }
  }, [data])

  // Multiple contexts, to avoid unnecessary re-renders of the components consuming the API when only the data changes, and vice-versa. See https://react.dev/reference/react/useContext#caveats for more details.
  return (
    <DataVersionContext.Provider value={version}>
      <ColumnDescriptorsContext.Provider value={columnDescriptors}>
        <NumColumnsContext.Provider value={numColumns}>
          <ExclusiveSortContext.Provider value={exclusiveSort}>
            <NumRowsContext.Provider value={numRows}>
              {children}
            </NumRowsContext.Provider>
          </ExclusiveSortContext.Provider>
        </NumColumnsContext.Provider>
      </ColumnDescriptorsContext.Provider>
    </DataVersionContext.Provider>
  )
}
