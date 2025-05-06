import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { DataFrame, sortableDataFrame } from '../../helpers/dataframe.js'
import { rowCache } from '../../helpers/rowCache.js'
import { OrderBy } from '../../helpers/sort.js'
import { wrapPromise, wrapResolved } from '../../utils/promise.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const data: DataFrame = {
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

function delay<T>(value: T, ms: number): Promise<T> {
  return new Promise(resolve => setTimeout(() => { resolve(value) }, ms))
}
const delayedData = sortableDataFrame({
  header: ['ID', 'Count'],
  numRows: 50,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, innerIndex) => {
    const index = innerIndex + start
    const ms = index % 3 === 0 ? 100 * Math.floor(10 * Math.random()) :
      index % 3 === 1 ? 100 * Math.floor(100 * Math.random()) :
        1e10
    return {
      index: wrapPromise(delay(index, ms)),
      cells: {
        ID: wrapPromise(delay(`row ${index}`, ms)),
        Count: wrapPromise(delay(50 - index, ms)),
      },
    }
  }),
})

const sortableData = rowCache(sortableDataFrame(data))

const dataWithUndefinedCells: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
    const id = index % 2 === 0 ? `row ${index + start}` : undefined
    const ms = index % 3 === 0 ? 0 :
      index % 3 === 1 ? 100 * Math.floor(10 * Math.random()) :
        100 * Math.floor(100 * Math.random())
    return {
      index: wrapResolved(index + start),
      cells: {
        ID: ms ? wrapPromise(delay(id, ms)) : wrapResolved(id),
        Count: wrapResolved(1000 - start - index),
      },
    }
  }),
}

const filteredData: DataFrame = rowCache(sortableDataFrame({
  header: ['ID', 'Count', 'Value1', 'Value2'],
  numRows: 100,
  // only the first 15 rows are valid, the rest are deleted
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
    if (index < 15) {
      const id = `row ${index + start}`
      const count = 1000 - start - index
      return {
        index: wrapResolved(index + start),
        cells: {
          ID: wrapResolved(id),
          Count: wrapResolved(count),
          Value1: wrapResolved(Math.floor(100 * random(135 + index))),
          Value2: wrapResolved(Math.floor(100 * random(648 + index))),
        },
      }
    } else {
      const error = { numRows: 15 }
      return {
        index: wrapPromise<number>(Promise.reject(error)),
        cells: {
          ID: wrapPromise<string>(Promise.reject(error)),
          Count: wrapPromise<number>(Promise.reject(error)),
          Value1: wrapPromise<number>(Promise.reject(error)),
          Value2: wrapPromise<number>(Promise.reject(error)),
        },
      }
    }
  }),
}))

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
export const Placeholders: Story = {
  args: {
    data: delayedData,
  },
}
export const UndefinedCells: Story = {
  args: {
    data: dataWithUndefinedCells,
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
export const FilteredRows: Story = {
  args: {
    data: filteredData,
  },
}
