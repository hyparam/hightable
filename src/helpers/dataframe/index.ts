import type { SortableDataFrame } from './sortableDataFrame.js'
import type { UnsortableDataFrame } from './unsortableDataFrame.js'
export { sortableDataFrame } from './sortableDataFrame.js'
export type { SortableDataFrame } from './sortableDataFrame.js'
export type { Cells, DataFrameEvents, ResolvedValue } from './types.js'
export { arrayDataFrame } from './unsortableDataFrame.js'
export type { UnsortableDataFrame } from './unsortableDataFrame.js'
export type DataFrame = SortableDataFrame | UnsortableDataFrame

export function isSortableDataFrame(dataFrame: DataFrame): dataFrame is SortableDataFrame {
  return dataFrame.sortable === true
}
