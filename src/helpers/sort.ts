export type Direction = 'ascending' | 'descending'

export interface ColumnOrderBy {
    column: string // column name to sort by.
    direction: Direction // sort direction.
}

export type OrderBy = ColumnOrderBy[]

export function checkOrderBy({ header, orderBy }: {header: string[], orderBy: OrderBy}): void {
  const unknownColumns = orderBy.map(({ column }) => column).filter(column => !header.includes(column))
  if (unknownColumns.length > 0) {
    throw new Error(`Invalid orderBy field: ${unknownColumns.join(', ')}`)
  }
}

export function areEqualOrderBy(a?: OrderBy, b?: OrderBy): boolean {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((itemA, i) => {
    const itemB = b[i]
    if (!itemB) return false
    return itemA.column === itemB.column && itemA.direction === itemB.direction
  })
}

export function partitionOrderBy(orderBy: OrderBy, column: string): {prefix: OrderBy, item?: ColumnOrderBy, suffix: OrderBy} {
  const prefix: OrderBy = []
  let item: ColumnOrderBy | undefined = undefined
  const suffix: OrderBy = []
  for (const current of orderBy) {
    if (item) {
      suffix.push(current)
    } else if (current.column === column) {
      item = current
    } else {
      prefix.push(current)
    }
  }
  return { prefix, item, suffix }
}

export function toggleColumn(column: string, orderBy: OrderBy): OrderBy {
  const { prefix, item, suffix } = partitionOrderBy(orderBy, column)
  if (item && prefix.length === 0) {
    // the column is the principal column. Cycle through the directions: ascending -> descending -> none
    if (item.direction === 'ascending') {
      // ascending -> descending
      return [{ column, direction: 'descending' }, ...suffix]
    } else {
      // descending -> none
      return [ ...suffix]
    }
  }
  // the column is not the principal column. Set it as the principal column with ascending direction
  return [{ column, direction: 'ascending' }, ...prefix, ...suffix]
}
