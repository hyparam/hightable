import type { Meta, StoryObj } from '@storybook/react'
import { DataFrame } from '../../helpers/dataframe.js'
import { wrapPromise } from '../../utils/promise.js'
import HighTable from './HighTable.js'

const data: DataFrame = {
  header: ['ID', 'Count'],
  numRows: 1000,
  rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => ({
    index: wrapPromise(index + start),
    cells: {
      ID: wrapPromise(`row ${index + start}`),
      Count: wrapPromise(1000 - start - index),
    },
  })),
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
