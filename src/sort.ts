export interface OrderBy {
  column?: string // column name to sort by. If undefined, the table is unsorted.
  direction?: 'ascending' // sort direction. Default: 'ascending'
}
