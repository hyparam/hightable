import { Cells } from './row.js'
import { OrderBy } from './sort'
import { CustomEventTarget, createEventTarget } from './typedEventTarget'

// Map of event type -> detail
// Starting with a single event, required in Iceberg
// TODO(SL): shall we force lowercase event type? https://developer.mozilla.org/en-US/docs/Web/API/Element/MozMousePixelScroll_event is a counter-example (but deprecated).
interface DataFrameEvents {
  'dataframe:numrowschange': { numRows: number };
}

/**
 * DataFrameV2 is an interface for a data structure that represents a table of data.
 *
 * It can mutate its data, and a table can subscribe to changes using the eventTarget.
 */
export interface DataFrameV2 {
  numRows: number
  header: string[]

  // TODO(SL): add getIndex, or getRowIndex({row, orderBy}) to get the index of a row in the original data when sorted by orderBy.

  // undefined means pending, ResolvedValue is a boxed value type (so we can distinguish undefined from pending)
  // getCell does NOT initiate a fetch, it just returns resolved data
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined

  // initiate fetches for row/column data:
  fetch({ rowStart, rowEnd, columns, orderBy }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy }): CancellableJob

  // emits events, defined in DataFrameEvents
  eventTarget: CustomEventTarget<DataFrameEvents>
}

interface ResolvedValue {
  value: any
}

interface CancellableJob {
  // table can call cancel when a user scrolls out of view. dataframe implementer can choose to ignore, de-queue, or cancel in flight fetches.
  cancel(): void
}

export function sortableDataFrame(data: DataFrameV2): DataFrameV2 {
  return data // TODO(SL): implement sorting
}

export function arrayDataFrame(data: Cells[]): DataFrameV2 {
  const eventTarget = createEventTarget<DataFrameEvents>()
  // eventTarget can be used as follows:
  //
  // listen to an event:
  // eventTarget.addEventListener('dataframe:numrowschange', (event) => {
  //   console.log('Number of rows changed:', event.detail.numRows)
  // })
  //
  // publish an event:
  // eventTarget.dispatchEvent(new CustomEvent('dataframe:numrowschange', { detail: { numRows: 42 } }))

  function fetch({ orderBy }: { rowStart: number, rowEnd: number, columns: string[], orderBy?: OrderBy }) {
    if (orderBy && orderBy.length > 0) {
      throw new Error('Sorting is not implemented.')
    }
    return {
      cancel: () => {
        // No-op for static data
      },
    }
  }

  const header = 0 in data ? Object.keys(data[0]) : []

  return {
    numRows: data.length,
    header,
    getCell: ({ row, column, orderBy }) => {
      if (orderBy && orderBy.length > 0) {
        throw new Error('Sorting is not implemented.')
      }
      const cells = data[row]
      if (!cells) {
        throw new Error(`Invalid row index: ${row}`)
      }
      if (!header.includes(column)) {
        throw new Error(`Invalid column: ${column}`)
      }
      if (!(column in cells)) {
        throw new Error(`Column "${column}" not found in row ${row}`)
      }
      // Return a resolved value (which might be undefined as well)
      return { value: cells[column] }
      // Note that this function never returns undefined (meaning pending cell), because the data is static.
    },
    fetch,
    eventTarget,
  }
}
