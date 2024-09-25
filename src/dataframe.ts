/**
 * Streamable row data
 */
export interface DataFrame {
  header: string[]
  numRows: number
  // Rows are 0-indexed, excludes the header, end is exclusive
  rows(start: number, end: number, orderBy?: string): Promise<Record<string, any>[]>
  sortable?: boolean
}

/**
 * Wraps a DataFrame to make it sortable.
 * Requires fetching all rows to sort.
 */
export function sortableDataFrame(data: DataFrame): DataFrame {
  if (data.sortable) return data // already sortable
  return {
    ...data,
    async rows(start: number, end: number, orderBy?: string) {
      if (orderBy) {
        // Get all rows, sort, and slice
        const rows = await data.rows(0, data.numRows)
        for (let i = 0; i < rows.length; i++) {
          rows[i].__index__ = i
        }
        return rows.sort((a, b) => {
          if (a[orderBy] < b[orderBy]) return -1
          if (a[orderBy] > b[orderBy]) return 1
          return 0
        }).slice(start, end)
      } else {
        return data.rows(start, end)
      }
    },
    sortable: true,
  }
}
