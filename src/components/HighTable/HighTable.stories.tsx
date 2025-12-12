import type { Meta, StoryObj } from '@storybook/react-vite'
import type { MouseEvent, ReactNode } from 'react'
import { useState } from 'react'

import { checkSignal, createGetRowNumber, validateFetchParams, validateGetCellParams } from '../../helpers/dataframe/helpers.js'
import type { DataFrame, DataFrameEvents } from '../../helpers/dataframe/index.js'
import { arrayDataFrame } from '../../helpers/dataframe/index.js'
import { sortableDataFrame } from '../../helpers/dataframe/sort.js'
import type { Fetch, ResolvedValue } from '../../helpers/dataframe/types.js'
import type { Selection } from '../../helpers/selection.js'
import type { OrderBy } from '../../helpers/sort.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import type { CellContentProps } from '../Cell/Cell.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function createUnsortableData(): DataFrame {
  const numRows = 1000
  const columnDescriptors = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3', 'Undefined'].map(name => ({ name }))
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    validateGetCellParams({ row, column, orderBy, data: { numRows, columnDescriptors } })
    const count = numRows - row
    return {
      value: column === 'ID'
        ? `row ${row}`
        : column === 'Count'
          ? count
          : column === 'Double'
            ? count * 2
            : column === 'Constant'
              ? 42
              : column === 'Value1'
                ? Math.floor(100 * random(135 + row))
                : column === 'Value2'
                  ? Math.floor(100 * random(648 + row))
                  : column === 'Value3'
                    ? Math.floor(100 * random(315 + row))
                    : undefined,
    }
  }
  const getRowNumber = createGetRowNumber({ numRows })
  return { columnDescriptors, numRows, getCell, getRowNumber }
}

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => {
    resolve(value)
  }, ms))
}
function createDelayedUnsortableData(): DataFrame {
  const columnDescriptors = ['ID', 'Count'].map(name => ({ name }))
  const numRows = 500
  const cache = new Map([
    ['ID', Array<ResolvedValue | undefined>(numRows).fill(undefined)],
    ['Count', Array<ResolvedValue | undefined>(numRows).fill(undefined)],
  ])
  const getRowNumber = createGetRowNumber({ numRows: numRows })
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): ResolvedValue | undefined {
    validateGetCellParams({ row, column, orderBy, data: { numRows, columnDescriptors } })
    return cache.get(column)?.[row]
  }
  const eventTarget = createEventTarget<DataFrameEvents>()
  const fetch: Fetch = async function ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) {
    checkSignal(signal)
    validateFetchParams({ rowStart, rowEnd, columns, orderBy, data: { numRows, columnDescriptors } })
    const columnPromises: Promise<any>[] = []
    for (const column of columns ?? []) {
      const valuePromises: Promise<any>[] = []
      for (let row = rowStart; row < rowEnd; row++) {
        const rowMs = row % 3 === 0
          ? 10 * Math.floor(10 * Math.random())
          : row % 3 === 1
            ? 20 * Math.floor(10 * Math.random())
            : 500
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
          if (currentCachedCell?.value !== value) {
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
    columnDescriptors,
    numRows,
    getCell,
    getRowNumber,
    fetch,
    eventTarget,
  }
}

function createVaryingArrayDataFrame({ delay_ms, maxRows }: { delay_ms?: number, maxRows?: number } = {}): DataFrame {
  delay_ms = delay_ms ?? 500
  maxRows = maxRows ?? 2

  const array: Record<string, any>[] = [
    { ID: 'row 0', Value: Math.floor(100 * random(135 + 0)) },
  ]
  const df = arrayDataFrame(array)
  // add a new row every delay_ms, until we reach maxRows rows, then update existing rows, then remove rows, and loop
  let i = 0
  const interval = setInterval(() => {
    i++
    const phase = Math.floor(i / maxRows) % 3
    if (phase === 0) {
      // append a row
      df._array.push({
        ID: `row ${i}`,
        Value: Math.floor(100 * random(135 + i)),
      })
    } else if (phase === 1) {
      // update a random row between 0 and maxRows
      const rowIndex = Math.floor(Math.random() * maxRows)
      df._array[rowIndex] = {
        ID: 'updated',
        Value: Math.floor(100 * random(135 + i)),
      }
    } else {
      // remove the last row
      df._array.pop()
    }
    // Stop after i reaches maxRows * 1000
    if (i >= maxRows * 1000) {
      clearInterval(interval)
    }
  }, delay_ms)

  return df
}

const longString = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'

function createLongStringsData(): DataFrame {
  return arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
    return {
      ID: `row ${index}`,
      LongString: longString.repeat(10),
      Value1: Math.floor(100 * random(135 + index)),
      Value2: Math.floor(100 * random(648 + index)),
    }
  }))
}

function createManyColumnsData(): DataFrame {
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

function createEmptyData(): DataFrame {
  const numRows = 0
  const columnDescriptors = ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3'].map(name => ({ name }))
  const getRowNumber = createGetRowNumber({ numRows })
  function getCell({ row, column, orderBy }: { row: number, column: string, orderBy?: OrderBy }): undefined {
    validateGetCellParams({ row, column, orderBy, data: { numRows, columnDescriptors } })
    return undefined
  }
  return { columnDescriptors, numRows, getRowNumber, getCell }
}

function createFilteredData(): DataFrame {
  const df = arrayDataFrame(Array.from({ length: 1000 }, (_, index) => {
    return {
      ID: `row ${index}`,
      LongString: longString.repeat(10),
      Value1: Math.floor(100 * random(135 + index)),
      Value2: Math.floor(100 * random(648 + index)),
    }
  }))
  df.getRowNumber = function ({ row }): ResolvedValue<number> | undefined {
    return {
      value: row * 10_000,
    }
  }
  return df
}

function createLargeData(): DataFrame {
  const numRows = 777_000_000
  const columnDescriptors = ['ID', 'Value'].map(name => ({ name }))
  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    return {
      value: column === 'ID' ? `row ${row}` :
        column === 'Value' ? Math.floor(100 * random(135 + row)) :
          undefined,
    }
  }
  const getRowNumber = createGetRowNumber({ numRows })
  return { columnDescriptors, numRows, getCell, getRowNumber }
}

function createSmallData(): DataFrame {
  const numRows = 8
  const columnDescriptors = ['ID', 'Value'].map(name => ({ name }))
  function getCell({ row, column }: { row: number, column: string }): ResolvedValue | undefined {
    return {
      value: column === 'ID' ? `row ${row}` :
        column === 'Value' ? Math.floor(100 * random(135 + row)) :
          undefined,
    }
  }
  const getRowNumber = createGetRowNumber({ numRows })
  return { columnDescriptors, numRows, getCell, getRowNumber }
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
type Story = StoryObj<typeof HighTable>

export const Default: Story = {
  args: {
    data: createUnsortableData(),
  },
}
export const Unstyled: Story = {
  args: {
    data: createUnsortableData(),
    styled: false,
  },
}
export const Sortable: Story = {
  args: {
    data: sortableDataFrame(createUnsortableData()),
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
    data: sortableDataFrame(createDelayedUnsortableData()),
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
    data: sortableDataFrame(createUnsortableData()),
  },
}
export const CustomTallHeaderStyle: Story = {
  args: {
    data: sortableDataFrame(createUnsortableData()),
    className: 'custom-hightable',
    columnConfiguration: {
      Double: {
        className: 'tall',
      },
    },
  },
}
export const CustomHeaderStyle: Story = {
  args: {
    data: createUnsortableData(),
    // See .storybook/global.css for the CSS rule
    // .custom-hightable thead th.delegated {
    //   background-color: #ffe9a9;
    // }
    className: 'custom-hightable',
    columnConfiguration: {
      Double: {
        className: 'delegated',
      },
    },
  },
}
export const HeaderComponent: Story = {
  args: {
    data: createUnsortableData(),
    columnConfiguration: {
      Double: {
        headerComponent: (
          <span>
            Double &nbsp;
            <button type="button" onClick={() => { alert('Custom function') }}>Button</button>
          </span>
        ),
      },
    },
  },
}
export const FunctionalHeaderComponent: Story = {
  args: {
    data: sortableDataFrame(createUnsortableData()),
    columnConfiguration: {
      Double: {
        headerComponent: (controls: ReactNode) => (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Text:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                style={{ background: 'none', border: '1px solid #ccc', padding: '2px 6px', borderRadius: '4px' }}
                onClick={(e) => {
                  e.stopPropagation()
                  alert('Confirm')
                }}
              >
                Confirm
              </button>
              {controls}
            </div>
          </div>
        ),
      },
    },
  },
}
export const HeaderComponentWithMinWidth: Story = {
  args: {
    data: createUnsortableData(),
    columnConfiguration: {
      ID: {
        minWidth: 150,
        headerComponent: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>ID</strong>
            <span style={{ fontSize: '12px', color: '#666' }}>(min: 150px)</span>
          </span>
        ),
      },
      Count: {
        minWidth: 80,
        headerComponent: (
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Count
            <span style={{ fontSize: '12px', color: '#666' }}>(min: 80px)</span>
          </span>
        ),
      },
      Double: {
        minWidth: 200,
        headerComponent: (
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
        ),
      },
    },
  },
}
export const NonSortableColunns: Story = {
  args: {
    // all columns are sortable, but "Double"
    data: sortableDataFrame(createUnsortableData(), { sortableColumns: new Set(['ID', 'Count', 'Constant', 'Value1', 'Value2', 'Value3', 'Undefined']) }),
  },
}
export const ExclusiveSort: Story = {
  render: (args) => {
    const [orderBy, setOrderBy] = useState<OrderBy>([])
    return (
      <HighTable
        {...args}
        orderBy={orderBy}
        onOrderByChange={setOrderBy}
      />
    )
  },
  args: {
    data: sortableDataFrame(createUnsortableData(), { exclusiveSort: true }),
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
    data: sortableDataFrame(createUnsortableData()),
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
    data: sortableDataFrame(createUnsortableData()),
  },
}

export const CustomCellRenderer: Story = {
  args: {
    data: createUnsortableData(),
    renderCellContent: CustomCellContent,
  },
}
export const FilteredData: Story = {
  args: {
    data: sortableDataFrame(createFilteredData()),
    maxRowNumber: 10_000 * 1_000,

  },
}
export const HiddenColumns: Story = {
  args: {
    data: sortableDataFrame(createUnsortableData()),
    columnConfiguration: {
      Value1: {
        initiallyHidden: true,
      },
      Value3: {
        initiallyHidden: true,
      },
    },
    cacheKey: 'hidden-columns-demo',
  },
}
export const DoubleClickCell: Story = {
  render: (args) => {
    const data = sortableDataFrame(createUnsortableData())
    function handleDoubleClick(_event: MouseEvent, col: number, row: number) {
      const columnName = data.columnDescriptors[col]?.name ?? 'unknown'
      const cellValue = data.getCell({ row, column: columnName })?.value
      alert(`Cell at column "${columnName}" (index ${col}), row ${row}:\n${cellValue}`)
    }
    return (
      <HighTable
        {...args}
        data={data}
        onDoubleClickCell={handleDoubleClick}
      />
    )
  },
  args: {},
}

export const VaryingData: Story = {
  render: ({ data }) => {
    const [selection, onSelectionChange] = useState<Selection>({
      ranges: [],
    })
    return (
      <HighTable
        data={data}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  },
  args: {
    data: createVaryingArrayDataFrame({ delay_ms: 500, maxRows: 2 }),
  },
}

export const LongVaryingData: Story = {
  render: ({ data }) => {
    const [selection, onSelectionChange] = useState<Selection>({
      ranges: [],
    })
    return (
      <HighTable
        data={data}
        selection={selection}
        onSelectionChange={onSelectionChange}
      />
    )
  },
  args: {
    data: createVaryingArrayDataFrame({ delay_ms: 10, maxRows: 1500 }),
  },
}

export const SortedVaryingData: Story = {
  render: ({ data }) => {
    const [selection, onSelectionChange] = useState<Selection>({
      ranges: [],
    })
    return (
      <HighTable
        data={data}
        selection={selection}
        onSelectionChange={onSelectionChange}
        orderBy={[{ column: 'Value', direction: 'ascending' }]}
      />
    )
  },
  args: {
    data: sortableDataFrame(createVaryingArrayDataFrame({ delay_ms: 200, maxRows: 20 })),
  },
}

export const LargeData: Story = {
  args: {
    data: createLargeData(),
  },
}

export const SmallData: Story = {
  args: {
    data: createSmallData(),
  },
}
