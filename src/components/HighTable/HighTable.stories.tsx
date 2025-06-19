import type { Meta, StoryObj } from '@storybook/react-vite'
import { UnsortableDataFrame, UnsortableDataFrameEvents } from '../../helpers/dataframe/unsortableDataFrame.js'
import { createEventTarget } from '../../helpers/typedEventTarget.js'
import HighTable from './HighTable.js'

function random(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const data: UnsortableDataFrame = {
  header: ['ID', 'Count', 'Double', 'Constant', 'Value1', 'Value2', 'Value3'],
  numRows: 1000,
  getCell({ row, column }) {
    const count = 1000 - row
    if (!this.header.includes(column)) {
      throw new Error(`Invalid column: ${column}`)
    }
    return {
      value: column === 'ID' ? `row ${row}` :
        column === 'Count' ? count :
          column === 'Double' ? count * 2 :
            column === 'Constant' ? 42 :
              column === 'Value1' ? Math.floor(100 * random(135 + row)) :
                column === 'Value2' ? Math.floor(100 * random(648 + row)) :
                  Math.floor(100 * random(315 + row)),
    }
  },
  fetch() {
    return {
      cancel: () => {
        // No-op for static data
      },
    }
  },
  eventTarget: createEventTarget<UnsortableDataFrameEvents>(),
}

// function delay<T>(value: T, ms: number): Promise<T> {
//   return new Promise(resolve => setTimeout(() => { resolve(value) }, ms))
// }
// const delayedData = sortableDataFrame({
//   header: ['ID', 'Count'],
//   numRows: 50,

//   rows: ({ start, end }) => Array.from({ length: end - start }, (_, innerIndex) => {
//     const index = innerIndex + start
//     const ms = index % 3 === 0 ? 100 * Math.floor(10 * Math.random()) :
//       index % 3 === 1 ? 100 * Math.floor(100 * Math.random()) :
//         1e10
//     return {
//       index: wrapPromise(delay(index, ms)),
//       cells: {
//         ID: wrapPromise(delay(`row ${index}`, ms)),
//         Count: wrapPromise(delay(50 - index, ms)),
//       },
//     }
//   }),
// })

// const sortableData = rowCache(sortableDataFrame(data))

// const dataWithUndefinedCells: DataFrame = {
//   header: ['ID', 'Count'],
//   numRows: 1000,
//   rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
//     const id = index % 2 === 0 ? `row ${index + start}` : undefined
//     const ms = index % 3 === 0 ? 0 :
//       index % 3 === 1 ? 100 * Math.floor(10 * Math.random()) :
//         100 * Math.floor(100 * Math.random())
//     return {
//       index: wrapResolved(index + start),
//       cells: {
//         ID: ms ? wrapPromise(delay(id, ms)) : wrapResolved(id),
//         Count: wrapResolved(1000 - start - index),
//       },
//     }
//   }),
// }

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

// const longStringsData: DataFrame = {
//   header: ['ID', 'LongString', 'Value1', 'Value2'],
//   numRows: 1000,
//   rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
//     const id = index + start
//     return {
//       index: wrapResolved(id),
//       cells: {
//         ID: wrapResolved( `row ${id}`),
//         LongString: wrapResolved('Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.repeat(10)),
//         Value1: wrapResolved(Math.floor(100 * random(135 + index))),
//         Value2: wrapResolved(Math.floor(100 * random(648 + index))),
//       },
//     }
//   }),
// }

// const manyColumnsData: DataFrame = {
//   header: ['ID1', 'LongString1', 'Value1', 'ID2', 'LongString2', 'Value2', 'ID3', 'LongString3', 'Value3', 'ID4', 'LongString4', 'Value4'],
//   numRows: 1000,
//   rows: ({ start, end }) => Array.from({ length: end - start }, (_, index) => {
//     const id = index + start
//     return {
//       index: wrapResolved(id),
//       cells: {
//         ID1: wrapResolved( `row ${id} A`),
//         LongString1: wrapResolved('A Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.repeat(10)),
//         Value1: wrapResolved(Math.floor(100 * random(123 + index))),
//         ID2: wrapResolved( `row ${id} B`),
//         LongString2: wrapResolved('B Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.repeat(8)),
//         Value2: wrapResolved(Math.floor(100 * random(456 + index))),
//         ID3: wrapResolved( `row ${id} C`),
//         LongString3: wrapResolved('C Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.repeat(12)),
//         Value3: wrapResolved(Math.floor(100 * random(789 + index))),
//         ID4: wrapResolved( `row ${id} D`),
//         LongString4: wrapResolved('D Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.repeat(10)),
//         Value4: wrapResolved(Math.floor(100 * random(951 + index))),
//       },
//     }
//   }),
// }

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
// export const Placeholders: Story = {
//   args: {
//     data: delayedData,
//   },
// }
// export const UndefinedCells: Story = {
//   args: {
//     data: dataWithUndefinedCells,
//   },
// }
// export const MultiSort: Story = {
//   render: (args) => {
//     const [orderBy, setOrderBy] = useState<OrderBy>([
//       { column: 'Count', direction: 'ascending' },
//       { column: 'Value1', direction: 'descending' },
//       { column: 'Value2', direction: 'ascending' },
//     ])
//     return (
//       <HighTable
//         {...args}
//         orderBy={orderBy}
//         onOrderByChange={setOrderBy}
//       />
//     )
//   },
//   args: {
//     data: sortableData,
//   },
// }
// export const CustomHeaderStyle: Story = {
//   args: {
//     data,
//     // See .storybook/global.css for the CSS rule
//     // .custom-hightable thead th.delegated {
//     //   background-color: #ffe9a9;
//     // }
//     className: 'custom-hightable',
//     columnClassNames: [undefined, undefined, 'delegated'],
//   },
// }
// export const HeaderComponent: Story = {
//   args: {
//     data,
//     columnConfiguration: {
//       Double: {
//         headerComponent:
//           <span>
//             Double &nbsp;<button type="button" onClick={() => { alert('Custom function') }}>Button</button>
//           </span>
//         ,
//       },
//     },
//   },
// }
// export const FilteredRows: Story = {
//   args: {
//     data: filteredData,
//   },
// }
// export const LongStrings: Story = {
//   args: {
//     data: longStringsData,
//   },
// }
// export const ManyColumns: Story = {
//   args: {
//     data: manyColumnsData,
//   },
// }
// export const RowsSelection: Story = {
//   render: (args) => {
//     const [selection, onSelectionChange] = useState<Selection>({
//       ranges: [{ start: 1, end: 3 }, { start: 5, end: 7 }],
//       anchor: 5,
//     })
//     return (
//       <HighTable
//         {...args}
//         selection={selection}
//         onSelectionChange={onSelectionChange}
//       />
//     )
//   },
//   args: {
//     data: sortableData,
//   },
// }

// export const ReadOnlySelection: Story = {
//   render: (args) => {
//     const selection = {
//       ranges: [{ start: 1, end: 3 }, { start: 5, end: 7 }],
//       anchor: 5,
//     }
//     return (
//       <HighTable
//         {...args}
//         selection={selection}
//       />
//     )
//   },
//   args: {
//     data: sortableData,
//   },
// }
