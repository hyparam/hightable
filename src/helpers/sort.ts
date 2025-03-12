export type Direction = 'ascending' | 'descending'

export interface ColumnOrderBy {
    column: string // column name to sort by.
    direction: Direction // sort direction.
}

export type OrderBy = ColumnOrderBy[]

export function areEqualOrderBy(a: OrderBy, b: OrderBy): boolean {
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
  const { item } = partitionOrderBy(orderBy, column)
  if (!item) {
    // TODO(SL): when multiple columns are not supported yet, append the new column with ascending to the current orderBy
    //   return [...orderBy, { column, direction: 'ascending' }]
    // for now: remove the existing columns and only sort by the new column
    // none -> ascending
    return [{ column, direction: 'ascending' }]
  } else if (item.direction === 'ascending') {
    // TODO(SL): when multiple columns are not supported yet, replace the column with descending
    //   return [...prefix, { column, direction: 'descending' }, ...suffix]
    // for now: remove the existing columns and only sort by the new column
    // ascending -> descending
    return [{ column, direction: 'descending' }]
  } else {
    // TODO(SL): when multiple columns are not supported yet, remove the column
    //   return [...prefix, ...suffix]
    // for now: return an empty array
    // descending -> none
    return []
  }
}
