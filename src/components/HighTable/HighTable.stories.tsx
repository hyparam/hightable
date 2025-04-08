import type { Meta, StoryObj } from '@storybook/react'
import { sortableDataFrame, wrapPromise } from 'hightable'
import { useState } from 'react'
import { DataFrame } from '../../helpers/dataframe.js'
import { OrderBy } from '../../helpers/sort.js'
import { wrapResolved } from '../../utils/promise.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const data: DataFrame = {
  header: ['ID', 'Count', 'Constant', 'Value1', 'Value2', 'Value3'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, i) => {
    const index = i + start
    return {
      index: wrapResolved(index),
      cells: {
        ID: wrapResolved(`row ${index}`),
        Count: wrapResolved(1000 - index),
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

const sortableData = sortableDataFrame(data)

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
