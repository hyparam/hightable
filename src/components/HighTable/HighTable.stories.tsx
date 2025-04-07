import type { Meta, StoryObj } from '@storybook/react'
import { sortableDataFrame, wrapPromise } from 'hightable'
import { DataFrame } from '../../helpers/dataframe.js'
import { wrapResolved } from '../../utils/promise.js'
import HighTable from './HighTable.js'

const data: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapResolved(index + start),
    cells: {
      ID: wrapResolved(`row ${index + start}`),
      Count: wrapResolved(1000 - start - index),
    },
  })),
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
