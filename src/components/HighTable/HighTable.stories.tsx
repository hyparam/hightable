import type { Meta, StoryObj } from '@storybook/react'
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
