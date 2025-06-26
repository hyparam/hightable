import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { DataFrame, DataFrameEvents, arrayDataFrame, cacheUnsortableDataFrame, getStaticFetch } from '../../helpers/dataframe/index.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const header = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3', 'Undefined']
function getCell({ row, column }: { row: number, column: string }) {
  const count = 1000 - row
  if (!header.includes(column)) {
    throw new Error(`Invalid column: ${column}`)
  }
  return {
    value: column === 'ID' ? `row ${row}` :
      column === 'Count' ? count :
        column === 'Double' ? count * 2 :
          column === 'Constant' ? 42 :
            column === 'Value1' ? Math.floor(100 * random(135 + row)) :
              column === 'Value2' ? Math.floor(100 * random(648 + row)) :
                column === 'Value3' ? Math.floor(100 * random(315 + row)) :
                  undefined,
  }
}
const data: DataFrame = {
  header,
  numRows: 1000,
  getUnsortedRow: ({ row }) => ({ value: row }),
  getCell,
  fetch: getStaticFetch({ getCell }),
  eventTarget: createEventTarget<DataFrameEvents>(),
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => { resolve(value) }, ms))
}
const delayedDataHeader = ['ID', 'Count']
const delayedDataNumRows = 500
async function delayedDataFetch({ rowStart, rowEnd, columns, signal, onColumnComplete }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal, onColumnComplete?: (data: {column: string, values: any[]}) => void }) {
  if (rowStart < 0 || rowEnd > delayedDataNumRows) {
    throw new Error(`Invalid row range: ${rowStart} - ${rowEnd}, numRows: ${delayedDataNumRows}`)
  }
  const columnPromises: Promise<any>[] = []
  for (const column of columns) {
    if (!delayedDataHeader.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    const valuePromises: Promise<any>[] = []
    for (let row = rowStart; row < rowEnd; row++) {
      const rowMs = row % 3 === 0 ? 10 * Math.floor(10 * Math.random()) :
        row % 3 === 1 ? 20 * Math.floor(10 * Math.random()) :
          500
      const ms = rowMs * (column === 'ID' ? 1 : 2)
      const resolvedValue = column === 'ID' ? `row ${row}` : delayedDataNumRows - row
      valuePromises.push(delay(resolvedValue, ms))
    }
    const columnPromise = Promise.all(valuePromises).then((values) => {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }
      onColumnComplete?.({ column, values })
    })
    columnPromises.push(columnPromise)
  }
  await Promise.all(columnPromises)
}

const noGetCellDelayedData: DataFrame = {
  header: delayedDataHeader,
  numRows: delayedDataNumRows,
  getUnsortedRow: ({ row }) => ({ value: row }),
  fetch: delayedDataFetch,
  getCell: () => { return undefined },
  eventTarget: createEventTarget<DataFrameEvents>(),
}
const delayedData = cacheUnsortableDataFrame(noGetCellDelayedData)
const sortableDelayedData = sortableDataFrame(delayedData)

const sortableData = sortableDataFrame(data)

// TODO(SL): implement a better way to test the change of numRows for the same dataframe
// const filteredData: DataFrame = rowCache(sortableDataFrame({
//   header: ['ID', 'Count', 'Value1', 'Value2'],
//   numRows: 1000,
//   // only the first 15 rows are valid, the rest are deleted
//   rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
//     const id = index + start
//     if (id < 150) {
//       const count = 1000 - id
//       return {
//         index: wrapResolved(id),
//         cells: {
//           ID: wrapResolved( `row ${id}`),
//           Count: wrapResolved(count),
//           Value1: wrapResolved(Math.floor(100 * random(135 + index))),
//           Value2: wrapResolved(Math.floor(100 * random(648 + index))),
//         },
//       }
//     } else {
//       const error = { numRows: 150 }
//       return {
//         index: wrapPromise<number>(Promise.reject(error)),
//         cells: {
//           ID: wrapPromise<string>(Promise.reject(error)),
//           Count: wrapPromise<number>(Promise.reject(error)),
//           Value1: wrapPromise<number>(Promise.reject(error)),
//           Value2: wrapPromise<number>(Promise.reject(error)),
//         },
//       }
//     }
//   }),
// }))

const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'
const longStringsData = sortableDataFrame(arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
  return {
    ID: `row ${index}`,
    LongString: longString.repeat(10),
    Value1: Math.floor(100 * random(135 + index)),
    Value2: Math.floor(100 * random(648 + index)),
  }
})))

const manyColumnsData = sortableDataFrame(arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
  return {
    ID1: `row ${index} A`,
    LongString1: longString.repeat(10),
    Value1: Math.floor(100 * random(123 + index)),
    ID2: `row ${index} B`,
    LongString2: longString.repeat(8),
    Value2: Math.floor(100 * random(456 + index)),
    ID3: `row ${index} C`,
    LongString3: longString.repeat(12),
    Value3: Math.floor(100 * random(789 + index)),
    ID4: `row ${index} D`,
    LongString4: longString.repeat(10),
    Value4: Math.floor(100 * random(951 + index)),
  }
})))

const emptyData: DataFrame = {
  header: ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3'],
  numRows: 0,
  getUnsortedRow: ({ row }) => ({ value: row }),
  getCell: () => { return undefined },
  fetch: () => Promise.resolve(),
  eventTarget: createEventTarget<DataFrameEvents>(),
}

const meta: Meta<typeof HighTable> = {
  component: HighTable,
}
export default meta
type Story = StoryObj<typeof HighTable>;

export const Default: Story = {
  args: {
    data,
  },
}
export const Unstyled: Story = {
  args: {
    data,
    styled: false,
  },
}
export const Sortable: Story = {
  args: {
    data: sortableData,
  },
}
export const Empty: Story = {
  args: {
    data: emptyData,
  },
}
export const EmptySelectable: Story = {
  render: (args) => {
    const [selection, onSelectionChange] = useState<Selection>({
      ranges: [],
    })
    return (
      <HighTable
        {...args}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  },
  args: {
    data: emptyData,
  },
}
export const Placeholders: Story = {
  args: {
    data: sortableDelayedData,
  },
}
export const MultiSort: Story = {
  render: (args) => {
    const [orderBy, setOrderBy] = useState<OrderBy>([
      { column: 'Count', direction: 'ascending' },
      { column: 'Value1', direction: 'descending' },
      { column: 'Value2', direction: 'ascending' },
    ])
    return (
      <HighTable
        {...args}
        orderBy={orderBy}
        onOrderByChange={setOrderBy}
      />
    )
  },
  args: {
    data: sortableData,
  },
}
export const CustomHeaderStyle: Story = {
  args: {
    data,
    // See .storybook/global.css for the CSS rule
    // .custom-hightable thead th.delegated {
    //   background-color: #ffe9a9;
    // }
    className: 'custom-hightable',
    columnClassNames: [undefined, undefined, 'delegated'],
  },
}
export const HeaderComponent: Story = {
  args: {
    data,
    columnConfiguration: {
      Double: {
        headerComponent:
          <span>
            Double &nbsp;<button type="button" onClick={() => { alert('Custom function') }}>Button</button>
          </span>
        ,
      },
    },
  },
}
export const NonSortableColunns: Story = {
  args: {
    data: sortableData,
    columnConfiguration: {
      Double: {
        sortable: false,
      },
    },
  },
}
// export const FilteredRows: Story = {
//   args: {
//     data: filteredData,
//   },
// }
export const LongStrings: Story = {
  args: {
    data: longStringsData,
  },
}
export const ManyColumns: Story = {
  args: {
    data: manyColumnsData,
  },
}
export const RowsSelection: Story = {
  render: (args) => {
    const [selection, onSelectionChange] = useState<Selection>({
      ranges: [{ start: 1, end: 3 }, { start: 5, end: 7 }],
      anchor: 5,
    })
    return (
      <HighTable
        {...args}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  },
  args: {
    data: sortableData,
  },
}
export const ReadOnlySelection: Story = {
  render: (args) => {
    const selection = {
      ranges: [{ start: 1, end: 3 }, { start: 5, end: 7 }],
      anchor: 5,
    }
    return (
      <HighTable
        {...args}
        selection={selection}
      />
    )
  },
  args: {
    data: sortableData,
  },
}
