export type Direction = 'ascending' | 'descending'

export interface ColumnOrderBy {
    column: string // column name to sort by.
    direction: Direction // sort direction.
}

export type OrderBy = ColumnOrderBy[]

export function serializeOrderBy(orderBy: OrderBy): string {
  return JSON.stringify(orderBy)
}

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

export function computeRanks(values: any[]): number[] {
  const valuesWithIndex = values.map((value, index) => ({ value, index }))
  const sortedValuesWithIndex = Array.from(valuesWithIndex).sort(({ value: a }, { value: b }) => {
    if (a < b) return -1
    if (a > b) return 1
    return 0
  })
  const numRows = sortedValuesWithIndex.length
  const ascendingRanks = sortedValuesWithIndex.reduce(({ lastValue, lastRank, ranks }, { value, index }, rank) => {
    if (value === lastValue) {
      ranks[index] = lastRank
      return { ranks, lastValue, lastRank }
    } else {
      ranks[index] = rank
      return { ranks, lastValue: value, lastRank: rank }
    }
  }, { ranks: Array(numRows).fill(-1), lastValue: undefined, lastRank: 0 }).ranks
  return ascendingRanks
}
