import { OrderBy } from '../sort.js'
import { CustomEventTarget } from '../typedEventTarget.js'
import { CancellableJob, CommonDataFrameEvents, ResolvedValue } from './types.js'
import { UnsortableDataFrame } from './unsortableDataFrame.js'

export type Cells = Record<string, any>

// Map of event type -> detail
// TODO(SL): shall we force lowercase event type? https://developer.mozilla.org/en-US/docs/Web/API/Element/MozMousePixelScroll_event is a counter-example (but deprecated).
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

  // TODO(SL): add getIndex, or getRowIndex({row, orderBy}) to get the index of a row in the original data when sorted by orderBy.

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
  throw new Error(`sortableDataFrame is not implemented yet - ignoring dataframe with columns: ${unsortableDataFrame.header.join(', ') }`)
}
