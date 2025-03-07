type Direction = 'ascending' | 'descending'
type DirectionAlias = 'asc' | 'desc' | undefined // alias for Direction. asc = ascending, desc = descending, undefined = ascending.

export interface NormalizedColumnOrderBy {
    column: string // column name to sort by.
    direction: Direction // sort direction.
}

export interface ColumnOrderBy extends Omit<NormalizedColumnOrderBy, 'direction'> {
  direction: Direction | DirectionAlias // sort direction.
}

export type OrderBy = ColumnOrderBy[]

export function normalizeDirection(direction: Direction | DirectionAlias): Direction {
  return direction === 'desc' || direction === 'descending' ? 'descending' : 'ascending'
}

export function areEqualColumnOrderBy(a: ColumnOrderBy, b: ColumnOrderBy): boolean {
  return a.column === b.column && normalizeDirection(a.direction) === normalizeDirection(b.direction)
}

export function areEqualOrderBy(a: OrderBy, b: OrderBy): boolean {
  if (a.length !== b.length) return false
  return a.every((itemA, i) => {
    const itemB = b[i]
    if (!itemB) return false
    return areEqualColumnOrderBy(itemA, itemB)
  })
}

export function hasDuplicateColumns(orderBy: OrderBy): boolean {
  const seen = new Set<string>()
  return orderBy.some(item => {
    if (seen.has(item.column)) return true
    seen.add(item.column)
    return false
  })
}

export function isValidOrderBy(orderBy: OrderBy): boolean {
  return !hasDuplicateColumns(orderBy)
}

export function partitionOrderBy(orderBy: OrderBy, column: string): [OrderBy, ColumnOrderBy, OrderBy] | undefined {
  if (!isValidOrderBy(orderBy)) {
    throw new Error('invalid orderBy')
  }
  const prefix: OrderBy = []
  let item: ColumnOrderBy | undefined = undefined
  const suffix: OrderBy = []
  for (const current of orderBy) {
    if (current.column === column) {
      if (item) {
        // should never happen
        throw new Error(`duplicate column ${column}`)
      }
      item = current
    } else if (item) {
      suffix.push(current)
    } else {
      prefix.push(current)
    }
  }
  return item ? [prefix, item, suffix] : undefined
}

export function toggleColumn(column: string, orderBy: OrderBy): OrderBy {
  if (!isValidOrderBy(orderBy)) {
    throw new Error('invalid orderBy')
  }
  const partition = partitionOrderBy(orderBy, column)
  if (!partition) {
    // none -> ascending
    return [...orderBy, { column, direction: 'ascending' }]
  }
  const [prefix, item, suffix] = partition
  const direction = normalizeDirection(item.direction)
  if (direction === 'ascending') {
    // ascending -> descending
    return [...prefix, { column, direction: 'descending' }, ...suffix]
  } else {
    // descending -> none
    return [...prefix, ...suffix]
  }
}
