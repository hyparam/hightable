# HighTable

![HighTable](hightable.jpg)

[![npm](https://img.shields.io/npm/v/hightable)](https://www.npmjs.com/package/hightable)
[![minzipped](https://img.shields.io/bundlephobia/minzip/hightable)](https://www.npmjs.com/package/hightable)
[![workflow status](https://github.com/hyparam/hightable/actions/workflows/ci.yml/badge.svg)](https://github.com/hyparam/hightable/actions)
[![mit license](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-95-darkred)
[![dependencies](https://img.shields.io/badge/Dependencies-0-blueviolet)](https://www.npmjs.com/package/hightable?activeTab=dependencies)

HighTable is a virtualized table component for React, designed to efficiently display large datasets in the browser. It loads and renders only the rows necessary for the current viewport, enabling smooth scrolling and performance even with millions of rows. HighTable supports asynchronous data fetching, dynamic loading, and optional column sorting.

## Features

 - **Virtualized Scrolling**: Efficiently renders only the visible rows, optimizing performance for large datasets.
 - **Asynchronous Data Loading**: Fetches data on-demand as the user scrolls, supporting datasets of any size.
 - **Column Sorting**: Optional support for sorting data by columns.
 - **Column Resizing**: Allows for resizing columns to fit the available space and auto-sizing.
 - **Row Selection**: Supports selecting multiple rows using shift+click.
 - **Event Handling**: Supports double-click events on cells.
 - **Loading Placeholder**: Displays animated loading indicator per-cell.

## Demo

Live table demo: [https://hyparam.github.io/demos/hightable/](https://hyparam.github.io/demos/hightable/). See the [source code](https://github.com/hyparam/demos/tree/master/hightable).

## Installation

Ensure you have React set up in your project. Install the HighTable package via npm:

```sh
npm i hightable
```

## Data Model

HighTable uses a data model called `DataFrame`, which defines how data is fetched and structured. The `DataFrame` object should have the following properties:

 - `header`: An array of strings representing the column names.
 - `numRows`: The total number of rows in the dataset.
 - `getRowNumber`: A function that returns the row number for a given row index. If not resolved yet, it returns undefined.
 - `getCell`: A function that returns the value of a cell at a specific row and column. If not resolved yet, it returns undefined.
  - `fetch`: An optional asynchronous function that fetches cells and row numbers, for a range of rows and columns. It should only fetch the missing data, and once the data is fetched, `getRowNumber` and `getCell` should return the resolved values. When using `useDataFrameCache`, call `setCell` to store fetched data.

## Usage

Here's a basic example of how to use HighTable in your React application:

```jsx
import HighTable, { useDataFrameCache } from 'hightable'

function App() {
  const { dataframe, setCell } = useDataFrameCache({
    numRows: 1000000,
    columnDescriptors: [{name: 'ID'}, {name: 'Name'}, {name: 'Email'}],
    async fetch({ rowStart, rowEnd, columns, orderBy, signal }) {
      // fetch cell data from your data source here
      for (let row = rowStart; row < rowEnd; row++) {
        for (const column of columns ?? []) {
          // Simulate async data fetching
          const value = await fetchCellData(row, column)
          // store the fetched data in the cache
          setCell(row, column, value)
        }
      }
    }
  })

  return (
    <HighTable
      data={dataframe}
      onError={console.error}
    />
  )
}

// Example fetch function
async function fetchCellData(row, column) {
  // Your data fetching logic here
  return column === 'ID' ? `row-${row}` : 
         column === 'Name' ? `User ${row}` :
         `${column.toLowerCase()}${row}@example.com`
}
```

### Alternative: Manual Cache Management

If you need more control over caching, you can still manage the cache manually:

```jsx
import HighTable, { createGetRowNumber } from 'hightable'

const eventTarget = new EventTarget()
const cache = new Map()
const store = (cells) => {
  for (const [col, values] of Object.entries(cells)) {
    if (!cache.has(col)) cache.set(col, new Map())
    for (const [row, value] of Object.entries(values)) {
      cache.get(col).set(Number(row), ({value}))
    }
  }
}

const dataframe = {
  columnDescriptors: [{name: 'ID'}, {name: 'Name'}, {name: 'Email'}],
  numRows: 1000000,
  getRowNumber: createGetRowNumber({ numRows: 1000000 }),
  getCell: ({ row, column }) => cache.get(column)?.get(row),
  eventTarget,
  async fetch({ rowStart, rowEnd, columns, orderBy, signal }) {
    // fetch cell data from your data source here
    const cells = await fetchCellData(rowStart, rowEnd, columns)
    // store the fetched data in the cache
    store(cells)
    // dispatch the resolve event to notify the table that the data is ready
    eventTarget.dispatchEvent(new CustomEvent('resolve'))
  }
}

function App() {
  return (
    <HighTable
      data={dataframe}
      onError={console.error}
    />
  )
}
```

## Props

HighTable accepts the following props:

```typescript
interface TableProps {
  data: DataFrame // data provider for the table
  focus?: boolean // focus table on mount? (default true)
  onDoubleClickCell?: (col: number, row: number) => void // double-click handler
  onError?: (error: Error) => void // error handler
  orderBy?: OrderBy; // order by column (if defined, the component order is controlled by the parent)
  onOrderByChange?: (orderBy: OrderBy) => void; // orderBy change handler
  selection?: Selection; // selection state (if defined, the component selection is controlled by the parent)
  onSelectionChange?: (selection: Selection) => void; // selection change handler
  columnConfiguration?: Record<string, ColumnConfig>; // allows for additional configuration of columns
  onColumnsVisibilityChange?: (columnVisibilityStates: MaybeHiddenColumn[]) => void; // columns visibility change handler
}
```

DataFrame is defined as:

```typescript
interface DataFrame<M extends Record<string, any>, C extends Record<string, any>> {
  columnDescriptors: ColumnDescriptor<C>[];
  numRows: number;
  metadata?: M; // optional metadata for the DataFrame - use the generic type for increased type safety
  // rows are 0-indexed, excludes the header, end is exclusive
  // if orderBy is defined, start and end are applied on the sorted rows
  getRowNumber({ row, orderBy }: { row: number, orderBy?: OrderBy }): ResolvedValue<number> | undefined
  getCell({ row, column, orderBy }: {row: number, column: string, orderBy?: OrderBy}): ResolvedValue | undefined
  fetch?: ({ rowStart, rowEnd, columns, orderBy, signal }: { rowStart: number, rowEnd: number, columns?: string[], orderBy?: OrderBy, signal?: AbortSignal }) => Promise<void>
  eventTarget?: EventTarget;
}
```

ColumnDescriptor is defined as:

```typescript
interface ColumnDescriptor<C extends Record<string, any>> {
  name: string; // column name
  sortable?: boolean; // is the column sortable? Defaults to false
  metadata?: C; // custom metadata extendable by the user
}
```

ResolvedValue is defined as:

```typescript
type ResolvedValue<T = any> = {
  value: T; // resolved value
}
```

OrderBy is defined as:

```typescript
interface OrderBy {
  column: string // column name
  direction?: "ascending" // sort direction - only ascending is supported
}
```

Selection is defined as:

```typescript
interface Selection {
  ranges: Array<{
    start: number // inclusive lower limit, positive integer
    end: number // exclusive upper limit, positive integer, strictly greater than start (no zero-length ranges).
  }>; // the rows selection is an array of row index ranges (0-based). The values are indexes of the virtual table (sorted rows), and thus depend on the order.
  anchor?: number // anchor row used as a reference for shift+click selection. It's a virtual table index (sorted), and thus depends on the order.
}
```

ColumnConfig is defined as:

```typescript
interface ColumnConfig {
  headerComponent?: React.ReactNode; // allows overriding column header cell with custom component
  minWidth?: number; // overrides the global column min width, useful for components with ui elements
}
```

## Array to DataFrame

HighTable includes a helper function to convert an array of objects to a DataFrame object. The function accepts an array of objects and assume that all the objects share the same keys. The dataframe is not sortable, see `sortableDataFrame` for that.

```javascript
import { arrayDataFrame } from 'hightable'
const data = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
]
const dataframe = arrayDataFrame(data)
```

## Sortable DataFrame

If your data source supports sorting, set the sortable property to true in your DataFrame object. When sorting is enabled, the rows function will receive an additional orderBy parameter, which represents the column name to sort by.

Ensure your rows function handles the orderBy parameter appropriately to return sorted data.

HighTable includes a helper function to transform a dataframe to a sorted dataframe:

```javascript
import { sortedDataFrame } from 'hightable'
const sortableDf = sortableDataFrame(df)
```

## Legacy DataFrame format

The legacy DataFrame format can still be used, but it is not recommended for new projects. It has the following structure:

```ts
export interface DataFrameV1 {
  header: string[]
  numRows: number
  rows({ start, end, orderBy }: { start: number, end: number, orderBy?: OrderBy }): AsyncRow[]
  getColumn?: GetColumn
  sortable?: boolean
}
```

HighTable provides a helper function to convert the legacy DataFrame format to the new format:

```javascript
import { convertV1ToDataFrame } from 'hightable/helpers/dataframe/legacy/index.js'
const legacyDataFrame = {
  header: ['ID', 'Name', 'Email'],
  numRows: 1000000,
  rows({ start, end }) {
    // fetch rows from your data source here
    return fetchRowsFromServer(start, end)
  }
}
const dataframe = convertV1ToDataFrame(legacyDataFrame)
```

## Styling

HighTable includes basic CSS styling to make the table functional. You can customize the appearance of the table using CSS.

## Structure of the code

The code is structured as follows:

- `src/`: Source code
  - `components/`: React components
  - `helpers/`: Helper functions, specific for HighTable
  - `hooks/`: Custom hooks
  - `utils/`: Generic utility functions
- `test/`: Unit tests (follows the same structure as `src/`)
