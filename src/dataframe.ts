/**
 * Dataframe utilities for hightable.
 *
 * This module exports dataframe-related functionality that can be used in both
 * browser and Node.js environments without React dependencies.
 *
 * @example
 * ```ts
 * import { arrayDataFrame, sortableDataFrame } from 'hightable/dataframe'
 * ```
 */

// Dataframe implementations and utilities
export { arrayDataFrame } from './helpers/dataframe/array.js'
export { checkSignal, createGetRowNumber, validateColumn, validateFetchParams, validateGetCellParams, validateGetRowNumberParams, validateOrderBy, validateRow } from './helpers/dataframe/helpers.js'
export { fetchIndexes, sortableDataFrame } from './helpers/dataframe/sort.js'
export { convertV1ToDataFrame } from './helpers/dataframe/legacy/convert.js'

// Types
export type { Cells, ColumnDescriptor, DataFrame, DataFrameEvents, Fetch, Obj, ResolvedValue } from './helpers/dataframe/types.js'

// Sort utilities
export type { OrderBy, Direction, ColumnOrderBy } from './helpers/sort.js'
export { areEqualOrderBy, deserializeOrderBy, partitionOrderBy, serializeOrderBy, toggleColumn, toggleColumnExclusive, validateOrderByAgainstSortableColumns, computeRanks } from './helpers/sort.js'

// Event target utilities
export { createEventTarget, TypedCustomEvent } from './helpers/typedEventTarget.js'
export type { CustomEventTarget } from './helpers/typedEventTarget.js'

// Selection utilities (pure functions, no React)
export type { Selection } from './helpers/selection.js'

// Legacy dataframe utilities
export { resolvablePromise, wrapPromise, wrapResolved } from './helpers/dataframe/legacy/promise.js'
export type { ResolvablePromise, WrappedPromise } from './helpers/dataframe/legacy/promise.js'
export { getGetColumn, getRanks } from './helpers/dataframe/legacy/dataframeV1.js'
export type { GetColumn } from './helpers/dataframe/legacy/dataframeV1.js'
export { asyncRows, awaitRow, awaitRows, resolvableRow } from './helpers/dataframe/legacy/row.js'
export type { AsyncRow, PartialRow, ResolvableRow, Row } from './helpers/dataframe/legacy/row.js'
export type { DataFrameV1 } from './helpers/dataframe/legacy/dataframeV1.js'

// Stringify utility (pure function, no dependencies)
export { stringify } from './utils/stringify.js'
