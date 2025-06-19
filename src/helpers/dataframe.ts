
// // return the column ranks in ascending order
// // we can get the descending order replacing the rank with numRows - rank - 1. It's not exactly the rank of
// // the descending order, because the rank is the first, not the last, of the ties. But it's enough for the
// // purpose of sorting.
// export async function getRanks({ data, column }: {data: DataFrame, column: string}): Promise<number[]> {
//   if (!data.header.includes(column)) {
//     throw new Error(`Invalid column: ${column}`)
//   }
//   const getColumn = getGetColumn(data)
//   const valuesWithIndex = (await getColumn({ column })).map((value, index) => ({ value, index }))
//   const sortedValuesWithIndex = Array.from(valuesWithIndex).sort(({ value: a }, { value: b }) => {
//     if (a < b) return -1
//     if (a > b) return 1
//     return 0
//   })
//   const numRows = sortedValuesWithIndex.length
//   const ascendingRanks = sortedValuesWithIndex.reduce(({ lastValue, lastRank, ranks }, { value, index }, rank) => {
//     if (value === lastValue) {
//       ranks[index] = lastRank
//       return { ranks, lastValue, lastRank }
//     } else {
//       ranks[index] = rank
//       return { ranks, lastValue: value, lastRank: rank }
//     }
//   }, { ranks: Array(numRows).fill(-1), lastValue: undefined, lastRank: 0 }).ranks
//   return ascendingRanks
// }

// export function computeDataIndexes(orderBy: { direction: 'ascending' | 'descending', ranks: number[] }[]): number[] {
//   if (!(0 in orderBy)) {
//     throw new Error('orderBy should have at least one element')
//   }
//   const numRows = orderBy[0].ranks.length
//   const indexes = Array.from({ length: numRows }, (_, i) => i)
//   const dataIndexes = indexes.sort((a, b) => {
//     for (const { direction, ranks } of orderBy) {
//       const rankA = ranks[a]
//       const rankB = ranks[b]
//       if (rankA === undefined || rankB === undefined) {
//         throw new Error('Invalid ranks')
//       }
//       const value = direction === 'ascending' ? 1 : -1
//       if (rankA < rankB) return -value
//       if (rankA > rankB) return value
//     }
//     return 0
//   })
//   // dataIndexes[0] gives the index of the first row in the sorted table
//   return dataIndexes
// }

// export function getUnsortedRanks({ data }: { data: DataFrame }): Promise<number[]> {
//   const { numRows } = data
//   const ranks = Array.from({ length: numRows }, (_, i) => i)
//   return Promise.resolve(ranks)
// }

// /**
//  * Wraps a DataFrame to make it sortable.
//  *
//  * If the DataFrame is already sortable, it will return the original DataFrame.
//  *
//  * It takes advantage of cached rows to sort the data faster:
//  * ```
//  * const df = sortableDataFrame(rowCache(data))
//  * ```
//  *
//  * If .getColumn() exists, it's used to sort the rows by the provided column.
//  *
//  * @param data DataFrame to make sortable
//  * @returns DataFrame with sortable rows
//  */
// export function sortableDataFrame(data: DataFrame): DataFrame {
//   if (data.sortable) return data // already sortable

//   // TODO(SL): call addGetColumn() to cache the rows if needed
//   // TODO(SL): create another type (DataFrameWithRanks?) that provides the cached ranks (and/or the cached data indexes for a given orderBy)

//   const ranksByColumn = new Map<string, Promise<number[]>>()
//   return {
//     ...data,
//     rows({ start, end, orderBy }): AsyncRow[] {
//       if (orderBy && orderBy.length > 0) {
//         if (orderBy.some(({ column }) => !data.header.includes(column)) ){
//           throw new Error(`Invalid orderBy field: ${orderBy.map(({ column }) => column).join(', ')}`)
//         }
//         // TODO(SL): only fetch ranks if needed?
//         // To get a consistent order in case of ties, we append a fake column orderby, to sort by the ascending indexes of the rows in the last case
//         const orderByWithDefaultSort = [...orderBy, { column: '', direction: 'ascending' as const }]
//         const orderByWithRanks = orderByWithDefaultSort.map(async ({ column, direction }) => {
//           const ranksPromise = ranksByColumn.get(column) ?? (column === '' ? getUnsortedRanks({ data }) : getRanks({ data, column }))
//           if (!ranksByColumn.has(column)) {
//             ranksByColumn.set(column, ranksPromise)
//           }
//           const ranks = await ranksPromise
//           return { column, direction, ranks }
//         })
//         // We cannot slice directly, because columns can have ties in the borders of the slice
//         // TODO(SL): avoid sorting along the whole columns, maybe sort only the slice, and expand if needed
//         const indexes = Promise.all(orderByWithRanks).then(computeDataIndexes)
//         const indexesSlice = indexes.then(indexes => indexes.slice(start, end))
//         const rowsSlice = indexesSlice.then(indexes => Promise.all(
//           // TODO(SL): optimize to fetch groups of rows instead of individual rows?
//           indexes.map(i => {
//             const asyncRowInArray = data.rows({ start: i, end: i + 1 })
//             if (!(0 in asyncRowInArray)) {
//               throw new Error('data.rows should have return one async row')
//             }
//             return asyncRowInArray[0]
//           })
//         ))
//         return asyncRows(rowsSlice, end - start, data.header)
//       } else {
//         return data.rows({ start, end })
//       }
//     },
//     sortable: true,
//   }
// }
