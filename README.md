# HighTable

![HighTable](hightable.jpg)

[![npm](https://img.shields.io/npm/v/hightable)](https://www.npmjs.com/package/hightable)
[![minzipped](https://img.shields.io/bundlephobia/minzip/hightable)](https://www.npmjs.com/package/hightable)
[![workflow status](https://github.com/hyparam/hightable/actions/workflows/ci.yml/badge.svg)](https://github.com/hyparam/hightable/actions)
[![mit license](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-94-darkred)
[![dependencies](https://img.shields.io/badge/Dependencies-0-blueviolet)](https://www.npmjs.com/package/hightable?activeTab=dependencies)

HighTable is a virtualized table component for React, designed to efficiently display large datasets in the browser. It loads and renders only the rows necessary for the current viewport, enabling smooth scrolling and performance even with millions of rows. HighTable supports asynchronous data fetching, dynamic loading, and optional column sorting.

## Features

 - **Virtualized Scrolling**: Efficiently renders only the visible rows, optimizing performance for large datasets.
 - **Asynchronous Data Loading**: Fetches data on-demand as the user scrolls, supporting datasets of any size.
 - **Column Sorting**: Optional support for sorting data by columns.
 - **Column Resizing**: Allows for resizing columns to fit the available space and auto-sizing.
 - **Event Handling**: Supports double-click events on cells.
 - **Loading Placeholder**: Displays animated loading indicator per-cell.

## Demo

Live table demo: [https://hyparam.github.io/hyperparam-cli/apps/hightable-demo/](https://hyparam.github.io/hyperparam-cli/apps/hightable-demo/). See the [source code](https://github.com/hyparam/hyperparam-cli/tree/master/apps/hightable-demo).

## Installation

Ensure you have React set up in your project. Install the HighTable package via npm:

```sh
npm i hightable
```

## Data Model

HighTable uses a data model called `DataFrame`, which defines how data is fetched and structured. The `DataFrame` object should have the following properties:

 - `header`: An array of strings representing the column names.
 - `numRows`: The total number of rows in the dataset.
 - `rows`: An asynchronous function that fetches rows. It should accept start and end row indices and return an array of row objects.
 - `sortable` (optional): A boolean indicating whether the table supports column sorting.

Each row object should be a mapping of column names to cell values.

## Usage

Here's a basic example of how to use HighTable in your React application:

```jsx
import HighTable from 'hightable'

const dataframe = {
  header: ['ID', 'Name', 'Email'],
  numRows: 1000000,
  rows(start, end, orderBy) {
    // fetch rows from your data source here
    return fetchRowsFromServer(start, end, orderBy)
  },
  sortable: true,
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
}
```

DataFrame is defined as:

```typescript
interface DataFrame {
  header: string[]
  numRows: number
  // rows are 0-indexed, excludes the header, end is exclusive
  // if orderBy is defined, start and end are applied on the sorted rows
  rows(start: number, end: number, orderBy?: string): AsyncRow[]
  sortable?: boolean
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

## Async DataFrame

HighTable supports async loading of individual cells. Dataframes return future cell data to the table as `AsyncRow[]`.

You can use the helper `asyncRows` (or the lower level `resolvableRow` and `wrapPromise`) to create the async rows. Their cells and index are Promises, with a field `resolved` set to the resolved value (or `rejected` set to the reason) when settled.

High-level example:

```javascript
import { asyncRows } from 'hightable'
const header = ['a', 'b']
const numRows = 10
// transform Promise<Row[]> to AsyncRow[]
const rows = asyncRows(fetchRows(...), numRows, header)
const dataframe = {
  header,
  numRows,
  rows(start, end) {
    return rows.slice(start, end)
  },
}
```

Low-level example:

```javascript
import { resolvableRow } from 'hightable'
const dataframe = {
  header: ['a', 'b'],
  numRows: 10,
  rows(start, end) {
    // resolvableRow makes a row where each column value is a wrapped promise with .resolve() and .reject() methods;
    // the row also contains a wrapped promise for the row index
    const futureRows = Array.from({ length: end - start }, () => resolvableRow(this.header))
    for (let row = start; row < end; row++) {
      for (const col of this.header) {
        fetchCell(row, col).then(value => futureRows[row - start].cells[col].resolve(value))
      }
      futureRows[row - start].index.resolve(row)
    }
    return futureRows
  },
}
```

## Styling

HighTable includes basic CSS styling to make the table functional. You can customize the appearance of the table using CSS.
