export interface ColumnOrderBy {
    column: string // column name to sort by.
}

export type OrderBy = ColumnOrderBy[]

export function areEqualOrderBy(a: OrderBy, b: OrderBy): boolean {
  if (a.length !== b.length) return false
  return a.every((itemA, i) => {
    const itemB = b[i]
    if (!itemB) return false
    return itemA.column === itemB.column
    // TODO(SL): compare direction when descending is supported
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
    return [{ column }]
  }
  // else:
  // ascending -> none
  return []

  // TODO(SL): when descending is supported, add:
  //
  // if (item.direction === 'ascending') {
  //   // ascending -> descending
  //   return [...prefix, { column, direction: 'descending' }, ...suffix]

  // and
  //
  // } else {
  //   // descending -> none
  //   return [...prefix, ...suffix]
  // }
}
