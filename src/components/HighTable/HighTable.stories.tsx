import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { checkSignal, createGetRowNumber, validateColumn, validateFetchParams, validateRow } from '../../helpers/dataframe/helpers.js'
import { DataFrameEvents, UnsortableDataFrame, arrayDataFrame } from '../../helpers/dataframe/index.js'
import { DataFrameV1, convertV1ToDataFrame } from '../../helpers/dataframe/legacy/index.js'
import { wrapPromise, wrapResolved } from '../../helpers/dataframe/legacy/promise.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import type { ResolvedValue } from '../../helpers/dataframe/types.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import type { CellContentProps } from './HighTable.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function createData(): UnsortableDataFrame {
  const numRows = 1000
  const header = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3', 'Undefined']
  function getCell({ row, column }: { row: number, column: string }) {
    validateColumn({ column, data: { header } })
    validateRow({ row, data: { numRows } })
    const count = numRows - row
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
  const getRowNumber = createGetRowNumber({ numRows })
  return { header, numRows, getCell, getRowNumber }
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => { resolve(value) }, ms))
}
function createDelayedData(): UnsortableDataFrame {
  const header = ['ID', 'Count']
  const numRows = 500
  const cache = new Map([
    ['ID', Array<ResolvedValue | undefined>(numRows).fill(undefined)],
    ['Count', Array<ResolvedValue | undefined>(numRows).fill(undefined)],
  ])
  const getRowNumber = createGetRowNumber({ numRows: numRows })
  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    validateColumn({ column, data: { header } })
    validateRow({ row, data: { numRows } })
    return cache.get(column)?.[row]
  }
  const eventTarget = createEventTarget<DataFrameEvents>()
  async function fetch({ rowStart, rowEnd, columns, signal }: { rowStart: number, rowEnd: number, columns?: string[], signal?: AbortSignal }) {
    checkSignal(signal)
    validateFetchParams({ rowStart, rowEnd, columns, data: { numRows, header } })
    const columnPromises: Promise<any>[] = []
    for (const column of columns ?? []) {
      const valuePromises: Promise<any>[] = []
      for (let row = rowStart; row < rowEnd; row++) {
        const rowMs = row % 3 === 0 ? 10 * Math.floor(10 * Math.random()) :
          row % 3 === 1 ? 20 * Math.floor(10 * Math.random()) :
            500
        const ms = rowMs * (column === 'ID' ? 1 : 2)
        const resolvedValue = column === 'ID' ? `row ${row}` : numRows - row
        valuePromises.push(delay(resolvedValue, ms).then((value) => {
          checkSignal(signal)
          const cachedColumn = cache.get(column)
          if (!cachedColumn) {
            throw new Error(`Column "${column}" not found in cache`)
          }
          // Cache the resolved value
          const currentCachedCell = cachedColumn[row]
          if (!currentCachedCell || currentCachedCell.value !== value) {
            cachedColumn[row] = { value }
            // Dispatch an event to notify that the cell has been updated
            eventTarget.dispatchEvent(new CustomEvent('resolve'))
          }
        }))
      }
      const columnPromise = Promise.all(valuePromises)
      columnPromises.push(columnPromise)
    }
    await Promise.all(columnPromises)
  }
  return {
    header,
    numRows,
    getCell,
    getRowNumber,
    fetch,
    eventTarget,
  }
}

const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'

function createLongStringsData(): UnsortableDataFrame {
  return arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
    return {
      ID: `row ${index}`,
      LongString: longString.repeat(10),
      Value1: Math.floor(100 * random(135 + index)),
      Value2: Math.floor(100 * random(648 + index)),
    }
  }))
}

function createManyColumnsData(): UnsortableDataFrame {
  return arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
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
  }))
}

function createEmptyData(): UnsortableDataFrame {
  const numRows = 0
  const header = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3']
  const getRowNumber = createGetRowNumber({ numRows })
  function getCell({ row, column }: {row: number, column: string}): undefined {
    validateColumn({ column, data: { header } })
    validateRow({ row, data: { numRows } })
    return undefined
  }
  return { header, numRows, getRowNumber, getCell }
}

function createLegacyData(): DataFrameV1 {
  return {
    header: ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3'],
    numRows: 1000,
    rows: ({ start, end }) => Array.from({ length: end - start }, (_, i) => {
      const index = i + start
      const count = 1000 - index
      return {
        index: wrapResolved(index),
        cells: {
          ID: wrapResolved(`row ${index}`),
          Count: wrapResolved(count),
          Double: wrapResolved(count * 2),
          Constant: wrapResolved(42),
          Value1: wrapResolved(Math.floor(100 * random(135 + index))),
          Value2: wrapResolved(Math.floor(100 * random(648 + index))),
          Value3: wrapResolved(Math.floor(100 * random(315 + index))),
        },
      }
    }),
  }
}

function createLegacyDelayedData(): DataFrameV1 {
  const numRows = 500
  return {
    header: ['ID', 'Count'],
    numRows,
    rows: ({ start, end }) => Array.from({ length: end - start }, (_, innerIndex) => {
      const index = innerIndex + start
      const ms = index % 3 === 0 ? 100 * Math.floor(10 * Math.random()) :
        index % 3 === 1 ? 20 * Math.floor(10 * Math.random()) :
          500
      return {
        index: wrapPromise(delay(index, ms)),
        cells: {
          ID: wrapPromise(delay(`row ${index}`, ms)),
          Count: wrapPromise(delay(numRows - index, ms)),
        },
      }
    }),
  }
}

function CustomCellContent({ cell, row, col, stringify }: CellContentProps) {
  return (
    <span>
      <strong>{`Cell at row ${row}, col ${col}: `}</strong>
      {stringify(cell?.value)}
    </span>
  )
}

const meta: Meta<typeof HighTable> = {
  component: HighTable,
}
export default meta
type Story = StoryObj<typeof HighTable>;

export const Default: Story = {
  args: {
    data: createData(),
  },
}
export const Unstyled: Story = {
  args: {
    data: createData(),
    styled: false,
  },
}
export const Sortable: Story = {
  args: {
    data: sortableDataFrame(createData()),
  },
}
export const Empty: Story = {
  args: {
    data: createEmptyData(),
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
    data: createEmptyData(),
  },
}
export const Placeholders: Story = {
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
    data: sortableDataFrame(createDelayedData()),
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
    data: sortableDataFrame(createData()),
  },
}
export const CustomHeaderStyle: Story = {
  args: {
    data: createData(),
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
    data: createData(),
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
export const HeaderComponentWithMinWidth: Story = {
  args: {
    data: createData(),
    columnConfiguration: {
      ID: {
        minWidth: 150,
        headerComponent:
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>ID</strong>
            <span style={{ fontSize: '12px', color: '#666' }}>(min: 150px)</span>
          </span>
        ,
      },
      Count: {
        minWidth: 80,
        headerComponent:
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Count
            <span style={{ fontSize: '12px', color: '#666' }}>(min: 80px)</span>
          </span>
        ,
      },
      Double: {
        minWidth: 200,
        headerComponent:
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Double Value
            <button
              type="button"
              onClick={() => { alert('This column has a 200px minimum width!') }}
              style={{ fontSize: '11px', padding: '2px 6px' }}
            >
              Info
            </button>
          </span>
        ,
      },
    },
  },
}
export const NonSortableColunns: Story = {
  args: {
    data: sortableDataFrame(createData()),
    columnConfiguration: {
      Double: {
        sortable: false,
      },
    },
  },
}
export const LongStrings: Story = {
  args: {
    data: sortableDataFrame(createLongStringsData()),
  },
}
export const ManyColumns: Story = {
  args: {
    data: sortableDataFrame(createManyColumnsData()),
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
    data: sortableDataFrame(createData()),
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
    data: sortableDataFrame(createData()),
  },
}

export const LegacySortable: Story = {
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
    data: sortableDataFrame(convertV1ToDataFrame(createLegacyData())),
  },
}
export const LegacyPlaceholders: Story = {
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
    data: sortableDataFrame(convertV1ToDataFrame(createLegacyDelayedData())),
  },
}
export const CustomCellRenderer: Story = {
  args: {
    data: createData(),
    renderCellContent: CustomCellContent,
  },
}
