import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DataFrameCache } from '../helpers/dataframe/cache.js'
import { createDataFrameCache } from '../helpers/dataframe/cache.js'
import type { DataFrame, Fetch, ResolvedValue } from '../helpers/dataframe/types.js'

export interface UseDataFrameCacheOptions {
  cacheKey?: string
  numRows: number
  columnDescriptors: { name: string, sortable?: boolean, metadata?: any }[]
  fetch?: Fetch
  getRowNumber?: (row: number) => ResolvedValue<number> | undefined
}

/**
 * Hook to create a complete DataFrame with built-in caching and automatic re-rendering.
 *
 * @param options Configuration options
 * @param options.cacheKey Optional key to identify the cache. When the key changes, a new cache is created.
 * @param options.numRows Number of rows in the DataFrame
 * @param options.columnDescriptors Column definitions for the DataFrame
 * @param options.fetch Optional async function to fetch data
 * @param options.getRowNumber Optional custom getRowNumber implementation. If not provided, defaults to row index.
 * @returns Object containing a ready-to-use DataFrame and helper functions
 */
export function useDataFrameCache(options: UseDataFrameCacheOptions = { numRows: 0, columnDescriptors: [] }) {
  const { cacheKey, numRows, columnDescriptors, fetch, getRowNumber: customGetRowNumber } = options

  // Use a ref to store the cache so it persists across re-renders but can be replaced when cacheKey changes
  const cacheRef = useRef<{ key: string | undefined, cache: DataFrameCache, version: number } | null>(null)
  
  // Version tracking for re-renders
  const [version, setVersion] = useState(0)

  // Create or get the cache
  const { dataFrameCache, cacheVersion } = useMemo(() => {
    // If no existing cache or the key has changed, create a new cache
    if (!cacheRef.current || cacheRef.current.key !== cacheKey) {
      cacheRef.current = {
        key: cacheKey,
        cache: createDataFrameCache(),
        version: 0,
      }
    }
    return { dataFrameCache: cacheRef.current.cache, cacheVersion: cacheRef.current.version }
  }, [cacheKey])

  // Set up listener for cache updates
  useEffect(() => {
    const unregister = dataFrameCache.registerCellListener(() => {
      setVersion(prev => prev + 1)
      if (cacheRef.current) {
        cacheRef.current.version++
      }
    })

    return unregister
  }, [dataFrameCache])

  // Default getRowNumber implementation
  const defaultGetRowNumber = useCallback((row: number): ResolvedValue<number> => {
    if (row < 0 || row >= numRows || !Number.isInteger(row)) {
      throw new Error(`Invalid row index: ${row}, numRows: ${numRows}`)
    }
    return { value: row }
  }, [numRows])

  // Final getRowNumber function (custom or default)
  const getRowNumberFn = customGetRowNumber ?? defaultGetRowNumber

  // Helper function to set a cell value
  const setCell = useCallback((row: number, column: string, value: any) => {
    dataFrameCache.setCell(row, column, value)
  }, [dataFrameCache])

  // Helper function to set a row number
  const setRowNumber = useCallback((row: number, rowNumber: number) => {
    dataFrameCache.setRowNumber(row, rowNumber)
  }, [dataFrameCache])

  // Helper function to clear the cache
  const clearCache = useCallback(() => {
    dataFrameCache.clearCache()
  }, [dataFrameCache])

  // Create the complete DataFrame
  const dataframe: DataFrame = useMemo(() => ({
    numRows,
    columnDescriptors,
    getCell: ({ row, column }) => dataFrameCache.getCell(row, column),
    getRowNumber: ({ row }) => getRowNumberFn(row),
    fetch,
    registerCellListener: dataFrameCache.registerCellListener,
  }), [numRows, columnDescriptors, dataFrameCache, customGetRowNumber, fetch])

  return {
    dataframe,
    setCell,
    setRowNumber,
    clearCache,
    // Include version for debugging/monitoring
    version,
  }
}
