import { OrderBy } from '../sort.js'
import { CustomEventTarget, createEventTarget } from '../typedEventTarget.js'
import { CancellableJob, CommonDataFrameEvents, ResolvedValue } from './types.js'
import { UnsortableDataFrame } from './unsortableDataFrame.js'

export type Cells = Record<string, any>

// Map of event type -> detail
export interface SortableDataFrameEvents extends CommonDataFrameEvents {
  'dataframe:update': { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy };
}

/**
 * DataFrame is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface SortableDataFrame {
  numRows: number
  header: string[]
  sortable: true // indicates that this DataFrame supports sorting

  // return the index of the row'th sorted row in the original unsorted data
  getUnsortedRow({ row, orderBy }: { row: number, orderBy?: OrderBy }): number

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined

  // initiate fetches for row/column data
  // static data frames don't need to implement it
  fetch?: ({ rowStart, rowEnd, columns, orderBy }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy }) => CancellableJob

  // emits events, defined in DataFrameEvents
  // eventTarget can be used as follows:
  //
  // listen to an event:
  // eventTarget.addEventListener('dataframe:numrowschange', (event) => {
  //   console.log('Number of rows changed:', event.detail.numRows)
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: 42 } }))
  eventTarget: CustomEventTarget<SortableDataFrameEvents>
}

export function sortableDataFrame(unsortableDataFrame: UnsortableDataFrame): SortableDataFrame {
  const eventTarget = createEventTarget<SortableDataFrameEvents>()
  unsortableDataFrame.eventTarget.addEventListener('dataframe:numrowschange', (event) => {
    // Forward the numRows change event to the sortable data frame
    eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: event.detail.numRows } }))
  })
  unsortableDataFrame.eventTarget.addEventListener('dataframe:update', (event) => {
    // Forward the update event to the sortable data frame
    const { rowStart, rowEnd, columns } = event.detail
    eventTarget.dispatchEvent(new CustomEvent('dataframe:update', { detail: { rowStart, rowEnd, columns } }))
  })
  // TODO(SL): the listeners are not removed, so we might leak memory if the sortableDataFrame is not used anymore.
  // We could add a method to remove the listeners (.dispose() ?).

  function getUnsortedRow({ row, orderBy }: { row: number, orderBy?: OrderBy }): number {
    if (!orderBy || orderBy.length === 0) {
      // If no orderBy is provided, we can return the row as is.
      return row
    }
    throw new Error('Sorting not implemented yet')
  }
  const df: SortableDataFrame = {
    numRows: unsortableDataFrame.numRows,
    header: [...unsortableDataFrame.header],
    sortable: true,
    getUnsortedRow,
    getCell({ row, column, orderBy }) {
      const unsortedRow = getUnsortedRow({ row, orderBy })
      return unsortableDataFrame.getCell({ row: unsortedRow, column })
    },
    eventTarget,
  }

  const { fetch } = unsortableDataFrame
  if (fetch) {
    df.fetch = ({ rowStart, rowEnd, columns, orderBy }) => {
      // If orderBy is provided, we need to fetch the data in the sorted order.
      // Otherwise, we can just fetch the data as is.
      if (orderBy) {
        // This is a placeholder for actual sorting logic.
        // In a real implementation, you would sort the data based on the orderBy criteria.
        throw new Error('Sorting not implemented yet')
      }
      return fetch({ rowStart, rowEnd, columns })
    }
  }
  return df
}
