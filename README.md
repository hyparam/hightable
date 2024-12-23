# HighTable

![HighTable](hightable.jpg)

[![npm](https://img.shields.io/npm/v/hightable)](https://www.npmjs.com/package/hightable)
[![minzipped](https://img.shields.io/bundlephobia/minzip/hightable)](https://www.npmjs.com/package/hightable)
[![workflow status](https://github.com/hyparam/hightable/actions/workflows/ci.yml/badge.svg)](https://github.com/hyparam/hightable/actions)
[![mit license](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
![coverage](https://img.shields.io/badge/Coverage-93-darkred)
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
}
```

DataFrame is defined as:

```typescript
interface DataFrame {
  header: string[]
  numRows: number
  // rows are 0-indexed, excludes the header, end is exclusive
  rows(start: number, end: number, orderBy?: string): AsyncRow[] | Promise<Row[]>
  sortable?: boolean
}
```

## Sortable DataFrame

If your data source supports sorting, set the sortable property to true in your DataFrame object. When sorting is enabled, the rows function will receive an additional orderBy parameter, which represents the column name to sort by.

Ensure your rows function handles the orderBy parameter appropriately to return sorted data.

## Async DataFrame

HighTable supports async loading of individual cells.
Dataframes can return `AsyncRow[]` to return future cell data to the table.

```javascript
const dataframe = {
  header: ['a', 'b'],
  numRows: 10,
  rows(start, end) {
    // resolvableRow makes a row where each column value is a wrapped promise with .resolve() and .reject() methods
    const futureRows = Array.from({ length: end - start }, () => resolvableRow(this.header))
    for (let row = start; row < end; row++) {
      for (const col of this.header) {
        fetchCell(row, col).then(value => futureRows[row - start][col].resolve(value))
      }
    }
    return futureRows
  },
}
```

## Styling

HighTable includes basic CSS styling to make the table functional. You can customize the appearance of the table using CSS.
