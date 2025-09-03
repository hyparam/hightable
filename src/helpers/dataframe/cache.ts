import type { ResolvedValue } from './types.js'

export type CellListener = () => void

export interface DataFrameCache {
  getCell(row: number, column: string): ResolvedValue | undefined
  getRowNumber(row: number): ResolvedValue<number> | undefined
  setCell(row: number, column: string, value: any): void
  setRowNumber(row: number, rowNumber: number): void
  registerCellListener(callback: CellListener): () => void
  clearCache(): void
  getCachedColumns(): string[]
  getCachedRowsForColumn(column: string): number[]
}

/**
 * Creates a cache for DataFrame cell data that automatically notifies listeners
 * when cells are modified.
 */
export function createDataFrameCache(): DataFrameCache {
  const cellCache = new Map<string, Map<number, ResolvedValue>>()
  const rowNumberCache = new Map<number, ResolvedValue<number>>()
  const listeners = new Set<CellListener>()

  function notifyListeners(): void {
    // Call all registered listeners
    listeners.forEach(listener => {
      try {
        listener()
      } catch (error) {
        console.error('Error in DataFrameCache listener:', error)
      }
    })
  }

  return {

    /**
     * Get a cell value from the cache.
     * Returns undefined if the cell hasn't been cached yet.
     */
    getCell(row: number, column: string): ResolvedValue | undefined {
      return cellCache.get(column)?.get(row)
    },

    /**
     * Get a row number from the cache.
     * Returns undefined if the row number hasn't been cached yet.
     */
    getRowNumber(row: number): ResolvedValue<number> | undefined {
      return rowNumberCache.get(row)
    },

    /**
     * Set a cell value in the cache and trigger event listeners.
     */
    setCell(row: number, column: string, value: any): void {
      if (!cellCache.has(column)) {
        cellCache.set(column, new Map())
      }

      const columnCache = cellCache.get(column)
      if (!columnCache) {
        throw new Error(`Column "${column}" not found in cache`)
      }
      const existingCell = columnCache.get(row)
      const resolvedValue: ResolvedValue = { value }

      // Only update and notify if the value has actually changed
      if (!existingCell || existingCell.value !== value) {
        columnCache.set(row, resolvedValue)
        notifyListeners()
      }
    },

    /**
     * Set a row number in the cache and trigger event listeners.
     */
    setRowNumber(row: number, rowNumber: number): void {
      const existingRowNumber = rowNumberCache.get(row)
      const resolvedValue: ResolvedValue<number> = { value: rowNumber }

      // Only update and notify if the value has actually changed
      if (!existingRowNumber || existingRowNumber.value !== rowNumber) {
        rowNumberCache.set(row, resolvedValue)
        notifyListeners()
      }
    },

    /**
     * Register a listener to be called when cells are updated.
     * Returns a function to unregister the listener.
     */
    registerCellListener(callback: CellListener): () => void {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },

    /**
     * Clear all cached data.
     */
    clearCache(): void {
      const hadData = cellCache.size > 0 || rowNumberCache.size > 0
      cellCache.clear()
      rowNumberCache.clear()

      // Notify listeners if we had data before clearing
      if (hadData) {
        notifyListeners()
      }
    },

    /**
     * Get all cached columns.
     */
    getCachedColumns(): string[] {
      return Array.from(cellCache.keys())
    },

    /**
     * Get all cached rows for a specific column.
     */
    getCachedRowsForColumn(column: string): number[] {
      const columnCache = cellCache.get(column)
      return columnCache ? Array.from(columnCache.keys()) : []
    },
  }
}
