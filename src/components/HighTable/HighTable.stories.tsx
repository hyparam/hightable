import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { createGetRowNumber, createNoOpFetch, validateGetCellParams } from '../../helpers/dataframe/helpers.js'
import { DataFrameEvents, DataFrameSimple, fromArray } from '../../helpers/dataframe/index.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import type { ResolvedValue } from '../../helpers/dataframe/types.js'
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
const data: DataFrameSimple = {
  header,
  numRows: 1000,
  getRowNumber: createGetRowNumber({ numRows: 1000 }),
  getCell,
  fetch: createNoOpFetch({ getCell, header, numRows: 1000 }),
}
const sortableData = sortableDataFrame(data)

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => { resolve(value) }, ms))
}
const delayedDataHeader = ['ID', 'Count']
const delayedDataNumRows = 500
const delayedCache = new Map([
  ['ID', Array<ResolvedValue | undefined>(delayedDataNumRows).fill(undefined)],
  ['Count', Array<ResolvedValue | undefined>(delayedDataNumRows).fill(undefined)],
])
function delayedGetCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
  validateGetCellParams({ row, column, data: { numRows: delayedDataNumRows, header: delayedDataHeader } })
  return delayedCache.get(column)?.[row]
}
const delayedEventTarget = createEventTarget<DataFrameEvents>()
async function delayedDataFetch({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns: string[], signal?: AbortSignal }) {
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
      valuePromises.push(delay(resolvedValue, ms).then((value) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }
        const cachedColumn = delayedCache.get(column)
        if (!cachedColumn) {
          throw new Error(`Column "${column}" not found in cache`)
        }
        // Cache the resolved value
        const currentCachedCell = cachedColumn[row]
        if (!currentCachedCell || currentCachedCell.value !== value) {
          cachedColumn[row] = { value }
          // Dispatch an event to notify that the cell has been updated
          delayedEventTarget.dispatchEvent(new CustomEvent('resolve'))
        }
      }))
    }
    const columnPromise = Promise.all(valuePromises)
    columnPromises.push(columnPromise)
  }
  await Promise.all(columnPromises)
}

const sortableDelayedData = sortableDataFrame({
  header: delayedDataHeader,
  numRows: delayedDataNumRows,
  fetch: delayedDataFetch,
  getCell: delayedGetCell,
  getRowNumber: createGetRowNumber({ numRows: delayedDataNumRows }),
  eventTarget: delayedEventTarget,
})

const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'
const longStringsData = sortableDataFrame(fromArray(Array.from({ length: 1000 }, (_, index) => {
  return {
    ID: `row ${index}`,
    LongString: longString.repeat(10),
    Value1: Math.floor(100 * random(135 + index)),
    Value2: Math.floor(100 * random(648 + index)),
  }
})))

const manyColumnsData = sortableDataFrame(fromArray(Array.from({ length: 1000 }, (_, index) => {
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

const emptyDataHeader = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3']
function emptyGetCell({ row, column }: {row: number, column: string}): undefined {
  validateGetCellParams({ row, column, data: { numRows: 0, header: emptyDataHeader } })
  return undefined
}
const emptyData: DataFrameSimple = {
  header: emptyDataHeader,
  numRows: 0,
  getRowNumber: createGetRowNumber({ numRows: 0 }),
  getCell: emptyGetCell,
  fetch: createNoOpFetch({ getCell: emptyGetCell, header: emptyDataHeader, numRows: 0 }),
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
